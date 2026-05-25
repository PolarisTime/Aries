import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getRefreshTokenSummary,
  listRefreshTokens,
  type RefreshTokenRecord,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from '@/api/session-management'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import { message, modal } from '@/utils/antd-app'
import { buildSessionTableColumns } from '@/views/system/session-management-view-utils'

export function useSessionManagementState(enabled = true) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('session', 'update')

  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshSessionData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.refreshTokensBase })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.refreshTokensSummary })
  }, [queryClient])

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

  const startAutoRefresh = useCallback(() => {
    refreshTimerRef.current = setInterval(() => {
      refreshSessionData()
    }, 30000)
  }, [refreshSessionData])

  const stopAutoRefresh = useCallback(() => {
    if (!refreshTimerRef.current) {
      return
    }
    clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = null
  }, [])

  useEffect(() => {
    // react-doctor: intentional callback, not event handler
    if (!enabled) {
      stopAutoRefresh()
      return
    }
    startAutoRefresh()
    return stopAutoRefresh
  }, [enabled, startAutoRefresh, stopAutoRefresh])

  const handleRevoke = useCallback(
    (record: RefreshTokenRecord) => {
      if (!canEdit) {
        message.warning(t('common.noPermission'))
        return
      }

      modal.confirm({
        title: '禁用令牌',
        content: '确定禁用该会话令牌吗？禁用后对应设备需要重新登录。',
        okText: '确认禁用',
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await revokeRefreshToken(record.id)
            message.success(t('common.disabled'))
            refreshSessionData()
          } catch (error) {
            showError(error, '禁用失败')
          }
        },
      })
    },
    [canEdit, refreshSessionData, showError],
  )

  const handleRevokeAll = useCallback(() => {
    if (!canEdit) {
      message.warning(t('common.noPermission'))
      return
    }

    modal.confirm({
      title: t('common.batchDelete'),
      content: '确定禁用所有有效的会话令牌吗？所有设备将需要重新登录。',
      okText: '确认清除',
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await revokeAllRefreshTokens()
          message.success(response.message || '已清除')
          refreshSessionData()
        } catch (error) {
          showError(error, '清除失败')
        }
      },
    })
  }, [canEdit, refreshSessionData, showError])

  const columns = useMemo(
    () => buildSessionTableColumns({ canEdit, onRevoke: handleRevoke }),
    [canEdit, handleRevoke],
  )

  return {
    canEdit,
    columns,
    currentPage,
    handleRevokeAll,
    isLoading,
    keyword,
    pageSize,
    refreshSessionData,
    setCurrentPage,
    setKeyword,
    setPageSize,
    summary,
    tokens,
    totalElements,
  }
}
