import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Modal, message } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import {
  type ApiKeyRecord,
  createApiKey,
  listApiKeyActionOptions,
  listApiKeyResourceOptions,
  listApiKeys,
  listApiKeyUserOptions,
  revokeApiKey,
} from '@/api/api-keys'
import { useRequestError } from '@/hooks/useRequestError'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'

interface ApiKeyCreateFormValues {
  userId?: string
  keyName?: string
  usageScope?: string
  allowedResources?: string[]
  allowedActions?: string[]
  expireDays?: number | null
}

export function useApiKeyManagementState() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const authStore = useAuthStore()

  const canCreate = useMemo(
    () => permissionStore.can('api-key', 'create'),
    [permissionStore],
  )
  const canEdit = useMemo(
    () => permissionStore.can('api-key', 'update'),
    [permissionStore],
  )
  const isCurrentUserTotpDisabled = useMemo(
    () => authStore.user?.totpEnabled === false,
    [authStore],
  )

  const [keyword, setKeyword] = useState('')
  const [filterUserId, setFilterUserId] = useState<string | undefined>(
    undefined,
  )
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [usageScopeFilter, setUsageScopeFilter] = useState<string | undefined>(
    undefined,
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [form] = Form.useForm<ApiKeyCreateFormValues>()

  const { data: keysData, isLoading } = useQuery({
    queryKey: [
      'api-keys',
      currentPage,
      pageSize,
      keyword,
      filterUserId,
      statusFilter,
      usageScopeFilter,
    ],
    queryFn: async () =>
      listApiKeys({
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        userId: filterUserId,
        status: statusFilter || undefined,
        usageScope: usageScopeFilter || undefined,
      }),
  })

  const keys = useMemo(() => keysData?.records || [], [keysData])
  const totalElements = useMemo(
    () => Number(keysData?.totalElements) || 0,
    [keysData],
  )

  const { data: userOptions = [] } = useQuery({
    queryKey: ['api-key-user-options'],
    queryFn: () => listApiKeyUserOptions(),
  })

  const { data: resourceOptions = [] } = useQuery({
    queryKey: ['api-key-resource-options'],
    queryFn: listApiKeyResourceOptions,
  })

  const { data: actionOptions = [] } = useQuery({
    queryKey: ['api-key-action-options'],
    queryFn: listApiKeyActionOptions,
  })

  const refreshApiKeys = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['api-keys'] })
  }, [queryClient])

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      message.success('已禁用')
      refreshApiKeys()
    },
    onError: (error: Error) => showError(error, '禁用失败'),
  })

  const openGenerateModal = useCallback(() => {
    if (!canCreate) {
      message.warning('暂无 API Key 创建权限')
      return
    }
    if (isCurrentUserTotpDisabled) {
      message.warning('当前账号未启用 2FA，禁止生成 API Key')
      return
    }

    setGeneratedKey(null)
    form.resetFields()
    form.setFieldsValue({
      usageScope: '全部接口',
      allowedActions: actionOptions.map((item) => item.code),
    })
    setGenerateModalOpen(true)
  }, [actionOptions, canCreate, form, isCurrentUserTotpDisabled])

  const handleGenerate = useCallback(async () => {
    try {
      const values = await form.validateFields()
      if (!values.userId || !values.keyName?.trim() || !values.usageScope) {
        message.warning('请选择用户、使用范围并填写密钥名称')
        return
      }
      if (!values.allowedActions?.length) {
        message.warning('请至少选择一个允许动作')
        return
      }
      setTotpModalOpen(true)
    } catch {
      /* validation failed */
    }
  }, [form])

  const handleGenerateWithTotp = useCallback(
    async (totpCode: string) => {
      const values = form.getFieldsValue()
      setTotpLoading(true)
      try {
        const response = await createApiKey(
          values.userId as string,
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
        message.success(response.message || 'API Key 已生成')
        refreshApiKeys()
      } catch (error) {
        showError(error, '生成失败')
        throw error
      } finally {
        setTotpLoading(false)
      }
    },
    [form, refreshApiKeys, showError],
  )

  const handleRevoke = useCallback(
    (record: ApiKeyRecord) => {
      if (!canEdit) {
        message.warning('暂无 API Key 管理权限')
        return
      }
      Modal.confirm({
        title: '禁用 API Key',
        content: `确定禁用密钥「${record.keyName}」吗？禁用后使用该密钥的调用将失败。`,
        okText: '确认禁用',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => revokeMutation.mutateAsync(record.id),
      })
    },
    [canEdit, revokeMutation],
  )

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
    setCurrentPage,
    setFilterUserId,
    setGenerateModalOpen,
    setGeneratedKey,
    setKeyword,
    setPageSize,
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
