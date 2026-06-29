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
    selector
      ? selector({ user: { totpEnabled: true } })
      : { user: { totpEnabled: true } },
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
    mockFormInstance.getFieldValue.mockReturnValue([])
    mockFormInstance.getFieldsValue.mockReturnValue({})
    mockFormInstance.validateFields.mockReset()
    mockCan.mockReturnValue(true)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
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
