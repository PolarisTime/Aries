import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListApiKeys = vi.fn()
const mockListApiKeyUserOptions = vi.fn()
const mockListApiKeyResourceOptions = vi.fn()
const mockListApiKeyActionOptions = vi.fn()
const mockCreateApiKey = vi.fn()
const mockRevokeApiKey = vi.fn()
const mockShowError = vi.fn()
const mockCan = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockUseQueryClient = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockRevokeMutateAsync = vi.fn()
const mockAuthStoreState = vi.hoisted(() => ({
  user: { totpEnabled: true as boolean | undefined },
}))
const mockFormInstance = vi.hoisted(() => ({
  resetFields: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldValue: vi.fn().mockReturnValue([]),
  setFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  validateFields: vi.fn(),
  getFieldValues: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/api-keys', () => ({
  listApiKeys: (...args: unknown[]) => mockListApiKeys(...args),
  listApiKeyUserOptions: (...args: unknown[]) =>
    mockListApiKeyUserOptions(...args),
  listApiKeyResourceOptions: (...args: unknown[]) =>
    mockListApiKeyResourceOptions(...args),
  listApiKeyActionOptions: (...args: unknown[]) =>
    mockListApiKeyActionOptions(...args),
  createApiKey: (...args: unknown[]) => mockCreateApiKey(...args),
  revokeApiKey: (...args: unknown[]) => mockRevokeApiKey(...args),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    apiKeys: ['apiKeys'],
    apiKeyList: (...args: unknown[]) => ['apiKeyList', ...args],
    apiKeyUserOptions: ['apiKeyUserOptions'],
    apiKeyResourceOptions: ['apiKeyResourceOptions'],
    apiKeyActionOptions: ['apiKeyActionOptions'],
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (state: Record<string, unknown>) => unknown) =>
    selector ? selector(mockAuthStoreState) : mockAuthStoreState,
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('antd', () => ({
  Form: {
    useForm: vi.fn(() => [mockFormInstance]),
  },
}))

import { useApiKeyManagementState } from '@/views/system/useApiKeyManagementState'

describe('useApiKeyManagementState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStoreState.user.totpEnabled = true
    mockFormInstance.getFieldValue.mockReturnValue([])
    mockFormInstance.getFieldsValue.mockReturnValue({})
    mockFormInstance.validateFields.mockReset()
    mockCan.mockReturnValue(true)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    })
    mockUseMutation.mockReturnValue({
      mutateAsync: mockRevokeMutateAsync,
      isPending: false,
    })
    mockUseQuery.mockReset()
    mockUseQuery.mockImplementation((args: { queryKey: unknown }) => {
      const key = args.queryKey as string[]
      if (key[0] === 'apiKeyUserOptions') {
        return { data: [{ value: '1', label: 'Admin' }], isLoading: false }
      }
      if (key[0] === 'apiKeyResourceOptions') {
        return {
          data: [{ value: 'res1', label: 'Resource 1' }],
          isLoading: false,
        }
      }
      if (key[0] === 'apiKeyActionOptions') {
        return {
          data: [
            { code: 'read', name: 'Read' },
            { code: 'write', name: 'Write' },
          ],
          isLoading: false,
        }
      }
      return {
        data: {
          records: [
            { id: '1', keyName: 'key1', status: 'active' },
            { id: '2', keyName: 'key2', status: 'revoked' },
          ],
          totalElements: 2,
        },
        isLoading: false,
      }
    })
  })

  const latestQueryConfig = (queryName: string) => {
    const call = mockUseQuery.mock.calls
      .map(
        ([config]) => config as { queryKey: string[]; queryFn: () => unknown },
      )
      .findLast((config) => config.queryKey[0] === queryName)
    if (!call) {
      throw new Error(`missing query config: ${queryName}`)
    }
    return call
  }

  const revokeMutationConfig = () => {
    const config = mockUseMutation.mock.calls[0]?.[0] as
      | {
          mutationFn: (id: string) => unknown
          onSuccess: () => void
          onError: (error: Error) => void
        }
      | undefined
    if (!config) {
      throw new Error('missing revoke mutation config')
    }
    return config
  }

  it('returns initial state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.keyword).toBe('')
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(20)
    expect(result.current.generateModalOpen).toBe(false)
    expect(result.current.generatedKey).toBeNull()
    expect(result.current.totpModalOpen).toBe(false)
    expect(result.current.filterUserId).toBeUndefined()
    expect(result.current.statusFilter).toBeUndefined()
    expect(result.current.usageScopeFilter).toBeUndefined()
  })

  it('fetches API keys on mount', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.keys).toHaveLength(2)
    expect(result.current.totalElements).toBe(2)
  })

  it('queryFns call API endpoints with default params', async () => {
    renderHook(() => useApiKeyManagementState())

    await latestQueryConfig('apiKeyList').queryFn()
    await latestQueryConfig('apiKeyUserOptions').queryFn()
    await latestQueryConfig('apiKeyResourceOptions').queryFn()
    await latestQueryConfig('apiKeyActionOptions').queryFn()

    expect(mockListApiKeys).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      keyword: undefined,
      userId: undefined,
      status: undefined,
      usageScope: undefined,
    })
    expect(mockListApiKeyUserOptions).toHaveBeenCalled()
    expect(mockListApiKeyResourceOptions).toHaveBeenCalled()
    expect(mockListApiKeyActionOptions).toHaveBeenCalled()
  })

  it('queryFn uses trimmed keyword and filters', async () => {
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.setCurrentPage(3)
      result.current.setPageSize(50)
      result.current.setKeyword('  key  ')
      result.current.setFilterUserId('user-1')
      result.current.setStatusFilter('active')
      result.current.setUsageScopeFilter('limited')
    })
    await latestQueryConfig('apiKeyList').queryFn()

    expect(mockListApiKeys).toHaveBeenCalledWith({
      page: 2,
      size: 50,
      keyword: 'key',
      userId: 'user-1',
      status: 'active',
      usageScope: 'limited',
    })
  })

  it('does not fetch when enabled is false', () => {
    mockUseQuery.mockReset()
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })
    renderHook(() => useApiKeyManagementState(false))
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('returns canCreate based on permission', () => {
    mockCan.mockReturnValue(false)
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.canCreate).toBe(false)
    expect(mockCan).toHaveBeenCalledWith('api-key', 'create')
  })

  it('returns canEdit based on permission', () => {
    mockCan.mockReturnValue(false)
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.canEdit).toBe(false)
    expect(mockCan).toHaveBeenCalledWith('api-key', 'update')
  })

  it('openGenerateModal shows warning when no permission', () => {
    mockCan.mockReturnValue(false)
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.openGenerateModal()
    })
    expect(mockMessageWarning).toHaveBeenCalled()
    expect(result.current.generateModalOpen).toBe(false)
  })

  it('openGenerateModal opens form when has permission', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.openGenerateModal()
    })
    expect(result.current.generateModalOpen).toBe(true)
  })

  it('openGenerateModal defaults allowed actions to read only', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.openGenerateModal()
    })
    expect(mockFormInstance.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedActions: ['read'],
      }),
    )
  })

  it('openGenerateModal does not default actions when read action is missing', () => {
    mockUseQuery.mockImplementation((args: { queryKey: unknown }) => {
      const key = args.queryKey as string[]
      if (key[0] === 'apiKeyActionOptions') {
        return { data: [{ code: 'write', name: 'Write' }], isLoading: false }
      }
      return { data: { records: [], totalElements: 0 }, isLoading: false }
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.openGenerateModal()
    })

    expect(mockFormInstance.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({ allowedActions: [] }),
    )
  })

  it('openGenerateModal keeps existing actions when form already has actions', () => {
    mockFormInstance.getFieldValue.mockReturnValue(['write'])
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.openGenerateModal()
    })

    expect(mockFormInstance.setFieldValue).not.toHaveBeenCalled()
  })

  it('openGenerateModal blocks generation when current user TOTP is disabled', () => {
    mockAuthStoreState.user.totpEnabled = false
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.openGenerateModal()
    })

    expect(result.current.isCurrentUserTotpDisabled).toBe(true)
    expect(mockMessageWarning).toHaveBeenCalledWith(
      '当前账号未启用 2FA，禁止生成 API Key',
    )
    expect(mockFormInstance.resetFields).not.toHaveBeenCalled()
    expect(result.current.generateModalOpen).toBe(false)
  })

  it('openGenerateModal resets generated key and form before opening', () => {
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.setGeneratedKey('old-key')
    })
    act(() => {
      result.current.openGenerateModal()
    })

    expect(result.current.generatedKey).toBeNull()
    expect(mockFormInstance.resetFields).toHaveBeenCalled()
    expect(result.current.generateModalOpen).toBe(true)
  })

  it('handleGenerate requires at least one resource', async () => {
    mockFormInstance.validateFields.mockResolvedValue({
      userId: '1',
      keyName: '集成密钥',
      usageScope: '全部接口',
      allowedActions: ['read'],
      allowedResources: [],
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith(
      '请至少选择一个允许访问资源',
    )
    expect(result.current.totpModalOpen).toBe(false)
  })

  it('handleGenerate requires basic required fields', async () => {
    mockFormInstance.validateFields.mockResolvedValue({
      userId: '',
      keyName: '   ',
      usageScope: '',
      allowedActions: ['read'],
      allowedResources: ['res1'],
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith(
      '请选择用户、使用范围并填写密钥名称',
    )
    expect(result.current.totpModalOpen).toBe(false)
  })

  it('handleGenerate requires at least one action', async () => {
    mockFormInstance.validateFields.mockResolvedValue({
      userId: '1',
      keyName: '集成密钥',
      usageScope: '全部接口',
      allowedActions: [],
      allowedResources: ['res1'],
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(mockMessageWarning).toHaveBeenCalledWith('请至少选择一个允许动作')
    expect(result.current.totpModalOpen).toBe(false)
  })

  it('handleGenerate opens TOTP modal for valid values', async () => {
    mockFormInstance.validateFields.mockResolvedValue({
      userId: '1',
      keyName: '集成密钥',
      usageScope: '全部接口',
      allowedActions: ['read'],
      allowedResources: ['res1'],
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(result.current.totpModalOpen).toBe(true)
  })

  it('handleGenerate ignores form validation rejection', async () => {
    mockFormInstance.validateFields.mockRejectedValue(new Error('invalid'))

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(mockMessageWarning).not.toHaveBeenCalled()
    expect(result.current.totpModalOpen).toBe(false)
  })

  it('handleGenerateWithTotp creates key with full payload', async () => {
    mockFormInstance.getFieldsValue.mockReturnValue({
      userId: '1',
      keyName: '  集成密钥  ',
      usageScope: '全部接口',
      allowedResources: ['res1'],
      allowedActions: ['read'],
      expireDays: 30,
    })
    mockCreateApiKey.mockResolvedValue({
      data: { rawKey: 'sk-raw' },
      message: '生成完成',
    })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerateWithTotp('123456')
    })

    expect(mockCreateApiKey).toHaveBeenCalledWith(
      '1',
      {
        keyName: '集成密钥',
        usageScope: '全部接口',
        allowedResources: ['res1'],
        allowedActions: ['read'],
        expireDays: 30,
      },
      '123456',
    )
    expect(result.current.generatedKey).toBe('sk-raw')
    expect(result.current.totpModalOpen).toBe(false)
    expect(result.current.totpLoading).toBe(false)
    expect(mockMessageSuccess).toHaveBeenCalledWith('生成完成')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['apiKeys'],
    })
  })

  it('handleGenerateWithTotp defaults missing optional fields', async () => {
    mockFormInstance.getFieldsValue.mockReturnValue({})
    mockCreateApiKey.mockResolvedValue({ data: {}, message: '' })

    const { result } = renderHook(() => useApiKeyManagementState())
    await act(async () => {
      await result.current.handleGenerateWithTotp('654321')
    })

    expect(mockCreateApiKey).toHaveBeenCalledWith(
      '',
      {
        keyName: '',
        usageScope: '',
        allowedResources: [],
        allowedActions: [],
        expireDays: null,
      },
      '654321',
    )
    expect(result.current.generatedKey).toBeNull()
    expect(mockMessageSuccess).toHaveBeenCalledWith('API Key 已生成')
  })

  it('handleGenerateWithTotp reports and rethrows create failure', async () => {
    const error = new Error('create failed')
    mockFormInstance.getFieldsValue.mockReturnValue({
      userId: '1',
      keyName: '集成密钥',
      usageScope: '全部接口',
      allowedResources: ['res1'],
      allowedActions: ['read'],
    })
    mockCreateApiKey.mockRejectedValue(error)

    const { result } = renderHook(() => useApiKeyManagementState())
    await expect(
      act(async () => {
        await result.current.handleGenerateWithTotp('123456')
      }),
    ).rejects.toThrow('create failed')

    expect(mockShowError).toHaveBeenCalledWith(error, '生成失败')
    expect(result.current.totpLoading).toBe(false)
  })

  it('setGenerateModalOpen updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setGenerateModalOpen(true)
    })
    expect(result.current.generateModalOpen).toBe(true)
  })

  it('setGeneratedKey updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setGeneratedKey('new-key')
    })
    expect(result.current.generatedKey).toBe('new-key')
  })

  it('setKeyword updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setKeyword('test')
    })
    expect(result.current.keyword).toBe('test')
  })

  it('setCurrentPage updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setCurrentPage(3)
    })
    expect(result.current.currentPage).toBe(3)
  })

  it('setPageSize updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setPageSize(50)
    })
    expect(result.current.pageSize).toBe(50)
  })

  it('setFilterUserId updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setFilterUserId('123')
    })
    expect(result.current.filterUserId).toBe('123')
  })

  it('setStatusFilter updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setStatusFilter('active')
    })
    expect(result.current.statusFilter).toBe('active')
  })

  it('setUsageScopeFilter updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setUsageScopeFilter('limited')
    })
    expect(result.current.usageScopeFilter).toBe('limited')
  })

  it('setTotpModalOpen updates state', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.setTotpModalOpen(true)
    })
    expect(result.current.totpModalOpen).toBe(true)
  })

  it('handleRevoke shows warning when no permission', () => {
    mockCan.mockReturnValue(false)
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.handleRevoke({ id: '1', keyName: 'key1' } as never)
    })
    expect(mockMessageWarning).toHaveBeenCalled()
    expect(mockModalConfirm).not.toHaveBeenCalled()
  })

  it('handleRevoke shows confirm dialog when has permission', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    act(() => {
      result.current.handleRevoke({ id: '1', keyName: 'key1' } as never)
    })
    expect(mockModalConfirm).toHaveBeenCalled()
  })

  it('handleRevoke confirm callback revokes the selected key', async () => {
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.handleRevoke({ id: 'key-1', keyName: 'key1' } as never)
    })
    const confirmConfig = mockModalConfirm.mock.calls[0][0] as {
      onOk: () => Promise<unknown>
    }
    await confirmConfig.onOk()

    expect(mockRevokeMutateAsync).toHaveBeenCalledWith('key-1')
  })

  it('revoke mutation success and error handlers show feedback', () => {
    const error = new Error('revoke failed')
    renderHook(() => useApiKeyManagementState())

    const config = revokeMutationConfig()
    config.mutationFn('key-1')
    config.onSuccess()
    config.onError(error)

    expect(mockRevokeApiKey).toHaveBeenCalledWith('key-1')
    expect(mockMessageSuccess).toHaveBeenCalledWith('已禁用')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['apiKeys'],
    })
    expect(mockShowError).toHaveBeenCalledWith(error, '禁用失败')
  })

  it('refreshApiKeys invalidates API key queries', () => {
    const { result } = renderHook(() => useApiKeyManagementState())

    act(() => {
      result.current.refreshApiKeys()
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['apiKeys'],
    })
  })

  it('returns form instance', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.form).toBeDefined()
  })

  it('handles empty key list', () => {
    mockUseQuery.mockReturnValue({
      data: { records: [], totalElements: 0 },
      isLoading: false,
    })
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.keys).toEqual([])
    expect(result.current.totalElements).toBe(0)
  })

  it('defaults option lists and totals when query data is missing', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() => useApiKeyManagementState())

    expect(result.current.keys).toEqual([])
    expect(result.current.totalElements).toBe(0)
    expect(result.current.userOptions).toEqual([])
    expect(result.current.resourceOptions).toEqual([])
    expect(result.current.actionOptions).toEqual([])
  })

  it('isCurrentUserTotpDisabled reflects auth store', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current.isCurrentUserTotpDisabled).toBe(false)
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useApiKeyManagementState())
    expect(result.current).toHaveProperty('actionOptions')
    expect(result.current).toHaveProperty('canCreate')
    expect(result.current).toHaveProperty('canEdit')
    expect(result.current).toHaveProperty('currentPage')
    expect(result.current).toHaveProperty('filterUserId')
    expect(result.current).toHaveProperty('form')
    expect(result.current).toHaveProperty('generateModalOpen')
    expect(result.current).toHaveProperty('generatedKey')
    expect(result.current).toHaveProperty('handleGenerate')
    expect(result.current).toHaveProperty('handleGenerateWithTotp')
    expect(result.current).toHaveProperty('handleRevoke')
    expect(result.current).toHaveProperty('isCurrentUserTotpDisabled')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('keys')
    expect(result.current).toHaveProperty('keyword')
    expect(result.current).toHaveProperty('openGenerateModal')
    expect(result.current).toHaveProperty('pageSize')
    expect(result.current).toHaveProperty('refreshApiKeys')
    expect(result.current).toHaveProperty('resourceOptions')
    expect(result.current).toHaveProperty('setCurrentPage')
    expect(result.current).toHaveProperty('setFilterUserId')
    expect(result.current).toHaveProperty('setGenerateModalOpen')
    expect(result.current).toHaveProperty('setGeneratedKey')
    expect(result.current).toHaveProperty('setKeyword')
    expect(result.current).toHaveProperty('setPageSize')
    expect(result.current).toHaveProperty('setStatusFilter')
    expect(result.current).toHaveProperty('setTotpModalOpen')
    expect(result.current).toHaveProperty('setUsageScopeFilter')
    expect(result.current).toHaveProperty('statusFilter')
    expect(result.current).toHaveProperty('totpLoading')
    expect(result.current).toHaveProperty('totpModalOpen')
    expect(result.current).toHaveProperty('totalElements')
    expect(result.current).toHaveProperty('usageScopeFilter')
    expect(result.current).toHaveProperty('userOptions')
  })
})
