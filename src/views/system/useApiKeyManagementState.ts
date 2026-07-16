import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import i18next from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ApiKeyRecord,
  createApiKey,
  listApiKeyActionOptions,
  listApiKeyResourceOptions,
  listApiKeys,
  listApiKeyUserOptions,
  revokeApiKey,
} from '@/api/api-keys'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useKeywordPaginationState } from '@/hooks/useKeywordPaginationState'
import { useRequestError } from '@/hooks/useRequestError'
import { useResourcePermissions } from '@/hooks/useResourcePermissions'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

interface ApiKeyCreateFormValues {
  userId?: string
  keyName?: string
  presetKey?: string
  usageScope?: string
  allowedResources?: string[]
  allowedActions?: string[]
  expireDays?: number | null
}

function getDefaultAllowedActions(
  actionOptions: Array<{ code: string }>,
): string[] {
  return actionOptions.some((item) => item.code === 'read') ? ['read'] : []
}

export function useApiKeyManagementState(enabled = true) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const authStore = useAuthStore()

  const { canCreate, canUpdate: canEdit } = useResourcePermissions('api-key')
  const isCurrentUserTotpDisabled = authStore.user?.totpEnabled === false

  const {
    keyword,
    currentPage,
    pageSize,
    setKeyword,
    resetPage,
    handlePageChange,
  } = useKeywordPaginationState()
  const [filterUserId, setFilterUserId] = useState<string | undefined>(
    undefined,
  )
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [usageScopeFilter, setUsageScopeFilter] = useState<string | undefined>(
    undefined,
  )
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [form] = Form.useForm<ApiKeyCreateFormValues>()
  const loadCreateOptions = enabled && generateModalOpen

  const { data: keysData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.apiKeyList(
      currentPage,
      pageSize,
      keyword,
      filterUserId,
      statusFilter,
      usageScopeFilter,
    ),
    queryFn: async () =>
      listApiKeys({
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        userId: filterUserId,
        status: statusFilter || undefined,
        usageScope: usageScopeFilter || undefined,
      }),
    enabled,
  })

  const keys = keysData?.records || []
  const totalElements = Number(keysData?.totalElements) || 0

  const { data: userOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.apiKeyUserOptions,
    queryFn: () => listApiKeyUserOptions(),
    enabled,
  })

  const { data: resourceOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.apiKeyResourceOptions,
    queryFn: listApiKeyResourceOptions,
    enabled: loadCreateOptions,
  })

  const { data: actionOptions = [] } = useQuery({
    queryKey: QUERY_KEYS.apiKeyActionOptions,
    queryFn: listApiKeyActionOptions,
    enabled: loadCreateOptions,
  })

  useEffect(() => {
    if (!generateModalOpen || actionOptions.length === 0) {
      return
    }
    const currentActions = form.getFieldValue('allowedActions')
    if (Array.isArray(currentActions) && currentActions.length > 0) {
      return
    }
    form.setFieldValue(
      'allowedActions',
      getDefaultAllowedActions(actionOptions),
    )
  }, [actionOptions, form, generateModalOpen])

  const refreshApiKeys = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys })
  }

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      message.success(i18next.t('system.apiKeyState.disabledSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys })
    },
    onError: (error: Error) =>
      showError(error, i18next.t('system.apiKeyState.disableFailed')),
  })

  const openGenerateModal = () => {
    if (!canCreate) {
      message.warning(i18next.t('system.apiKeyState.noCreatePermission'))
      return
    }
    if (isCurrentUserTotpDisabled) {
      message.warning(i18next.t('system.apiKeyState.totpRequired'))
      return
    }

    setGeneratedKey(null)
    form.resetFields()
    form.setFieldsValue({
      presetKey: 'custom',
      usageScope: '全部接口',
      allowedActions: getDefaultAllowedActions(actionOptions),
    })
    setGenerateModalOpen(true)
  }

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      if (!values.userId || !values.keyName?.trim() || !values.usageScope) {
        message.warning(i18next.t('system.apiKeyState.fillRequired'))
        return
      }
      if (!values.allowedActions?.length) {
        message.warning(i18next.t('system.apiKeyState.selectOneAction'))
        return
      }
      if (!values.allowedResources?.length) {
        message.warning(i18next.t('system.apiKeyState.selectOneResource'))
        return
      }
      setTotpModalOpen(true)
    } catch {
      /* validation failed */
    }
  }

  const handleGenerateWithTotp = async (totpCode: string) => {
    const values = form.getFieldsValue()
    setTotpLoading(true)
    try {
      const response = await createApiKey(
        asString(values.userId),
        {
          keyName: values.keyName?.trim() || '',
          usageScope: values.usageScope || '',
          allowedResources: values.allowedResources || [],
          allowedActions: values.allowedActions || [],
          expireDays: values.expireDays ?? null,
        },
        totpCode,
      )
      setGeneratedKey(response.data?.rawKey || null)
      setTotpModalOpen(false)
      message.success(
        response.message || i18next.t('system.apiKeyState.generatedSuccess'),
      )
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys })
      setTotpLoading(false)
    } catch (error) {
      showError(error, i18next.t('system.apiKeyState.generateFailed'))
      setTotpLoading(false)
      throw error
    }
  }

  const handleRevoke = (record: ApiKeyRecord) => {
    if (!canEdit) {
      message.warning(i18next.t('system.apiKeyState.noManagePermission'))
      return
    }
    modal.confirm({
      title: i18next.t('system.apiKeyState.disableConfirmTitle'),
      content: i18next.t('system.apiKeyState.disableConfirmContent', {
        keyName: record.keyName,
      }),
      okText: t('common.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => revokeMutation.mutateAsync(record.id),
    })
  }

  return {
    actionOptions,
    canCreate,
    canEdit,
    currentPage,
    filterUserId,
    form,
    generateModalOpen,
    generatedKey,
    handleGenerate,
    handleGenerateWithTotp,
    handleRevoke,
    isCurrentUserTotpDisabled,
    isLoading,
    keys,
    keyword,
    openGenerateModal,
    pageSize,
    refreshApiKeys,
    resourceOptions,
    resetPage,
    handlePageChange,
    setFilterUserId,
    setGenerateModalOpen,
    setGeneratedKey,
    setKeyword,
    setStatusFilter,
    setTotpModalOpen,
    setUsageScopeFilter,
    statusFilter,
    totpLoading,
    totpModalOpen,
    totalElements,
    usageScopeFilter,
    userOptions,
  }
}
