import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getRefreshTokenSummary,
  listRefreshTokens,
  type RefreshTokenRecord,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from '@/api/session-management'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useKeywordPaginationState } from '@/hooks/useKeywordPaginationState'
import { useRequestError } from '@/hooks/useRequestError'
import { useResourcePermissions } from '@/hooks/useResourcePermissions'
import { message, modal } from '@/utils/antd-app'
import { buildSessionTableColumns } from '@/views/system/session-management-view-utils'

export function useSessionManagementState(enabled = true) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const { canUpdate: canEdit } = useResourcePermissions('session')

  const {
    keyword,
    currentPage,
    pageSize,
    setKeyword,
    resetPage,
    handlePageChange,
  } = useKeywordPaginationState()

  const refreshSessionData = () => {
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.refreshTokensBase,
    })
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.refreshTokensSummary,
    })
  }

  const { data: tokensData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.refreshTokens(currentPage, pageSize, keyword),
    queryFn: async () =>
      listRefreshTokens({
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
      }),
    enabled,
  })

  const { data: summary } = useQuery({
    queryKey: QUERY_KEYS.refreshTokensSummary,
    queryFn: getRefreshTokenSummary,
    enabled,
  })

  const tokens = tokensData?.records || []
  const totalElements = Number(tokensData?.totalElements) || 0

  useEffect(() => {
    const refreshSessionData = () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.refreshTokensBase,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.refreshTokensSummary,
      })
    }

    if (!enabled) {
      return
    }
    const refreshTimer = setInterval(() => {
      refreshSessionData()
    }, 30000)
    return () => {
      clearInterval(refreshTimer)
    }
  }, [enabled, queryClient])

  const handleRevoke = (record: RefreshTokenRecord) => {
    if (!canEdit) {
      message.warning(t('common.noPermission'))
      return
    }

    modal.confirm({
      title: t('system.session.disable'),
      content: t('system.session.disableConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await revokeRefreshToken(record.id)
          message.success(t('system.session.disabledSuccess'))
          refreshSessionData()
        } catch (error) {
          showError(error, t('api.disableSessionFailed'))
        }
      },
    })
  }

  const handleRevokeAll = () => {
    if (!canEdit) {
      message.warning(t('common.noPermission'))
      return
    }

    modal.confirm({
      title: t('system.session.revokeAll'),
      content: t('system.session.revokeAllConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await revokeAllRefreshTokens()
          message.success(response.message || t('system.session.revoked'))
          refreshSessionData()
        } catch (error) {
          showError(error, t('api.clearAllSessionsFailed'))
        }
      },
    })
  }

  const columns = buildSessionTableColumns({
    canEdit,
    onRevoke: handleRevoke,
    t,
  })

  return {
    canEdit,
    columns,
    currentPage,
    handleRevokeAll,
    isLoading,
    keyword,
    pageSize,
    refreshSessionData,
    resetPage,
    handlePageChange,
    setKeyword,
    summary,
    tokens,
    totalElements,
  }
}
