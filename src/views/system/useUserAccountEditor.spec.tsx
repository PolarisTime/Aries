import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateUserAccount = vi.fn()
const mockUpdateUserAccount = vi.fn()
const mockGetUserAccountDetail = vi.fn()
const mockCheckUserAccountLoginName = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockUseMutation = vi.fn()
const mockUseQueryClient = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/user-accounts', () => ({
  createUserAccount: (...args: unknown[]) => mockCreateUserAccount(...args),
  updateUserAccount: (...args: unknown[]) => mockUpdateUserAccount(...args),
  getUserAccountDetail: (...args: unknown[]) =>
    mockGetUserAccountDetail(...args),
  checkUserAccountLoginName: (...args: unknown[]) =>
    mockCheckUserAccountLoginName(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { userAccountBase: ['userAccount'] },
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
}))

vi.mock('@/views/system/user-account-view-utils', () => ({
  buildDefaultUserAccountFormValues: () => ({
    loginName: '',
    password: '',
    userName: '',
    mobile: '',
    departmentId: null,
    roleNames: [],
    dataScope: '本人',
    permissionSummary: '',
    status: 'enabled',
    remark: '',
  }),
}))

vi.mock('@/views/system/useUserAccountEditorCatalogs', () => ({
  useUserAccountEditorCatalogs: () => ({
    departmentOptions: [{ value: '10', label: 'Engineering' }],
    roleOptions: [{ id: '1', roleName: 'Admin', dataScope: '全部数据' }],
  }),
}))

vi.mock('@/views/system/useUserAccountEditorRoleState', () => ({
  useUserAccountEditorRoleState: () => ({
    selectedRoleDataScope: '本人',
    selectedRoleIds: [],
    selectedRoleSummaries: [],
  }),
}))

vi.mock('antd/es/form', () => {
  const formInstance = {
    resetFields: vi.fn(),
    setFieldsValue: vi.fn(),
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn(() => ({
      loginName: 'testuser',
      password: 'pass123',
      userName: 'Test User',
      mobile: '1234567890',
      roleNames: ['Admin'],
      dataScope: '本人',
      status: 'enabled',
    })),
    validateFields: vi.fn(() => ({
      loginName: 'testuser',
      password: 'pass123',
      userName: 'Test User',
      mobile: '1234567890',
      roleNames: ['Admin'],
      dataScope: '本人',
      status: 'enabled',
    })),
  }
  return {
    default: {
      useForm: vi.fn(() => [formInstance]),
    },
  }
})

import { useUserAccountEditor } from '@/views/system/useUserAccountEditor'

describe('useUserAccountEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: true,
      message: '',
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editorMode).toBe('create')
    expect(result.current.editorLoading).toBe(false)
    expect(result.current.editingId).toBeNull()
    expect(result.current.createResultOpen).toBe(false)
    expect(result.current.createResult).toBeNull()
  })

  it('returns form and options', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.form).toBeDefined()
    expect(result.current.departmentOptions).toBeDefined()
    expect(result.current.roleOptions).toBeDefined()
  })

  it('openCreateModal sets mode to create and opens editor', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editorMode).toBe('create')
  })

  it('openEditModal fetches detail and opens editor', async () => {
    const detail = {
      id: '1',
      loginName: 'admin',
      userName: 'Admin',
      mobile: '123',
      roleNames: ['Admin'],
      dataScope: '全部数据',
      status: 'enabled',
    }
    mockGetUserAccountDetail.mockResolvedValue(detail)
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '1' } as never)
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editorMode).toBe('edit')
    await waitFor(() => {
      expect(result.current.editorLoading).toBe(false)
    })
  })

  it('openEditModal handles error', async () => {
    mockGetUserAccountDetail.mockRejectedValue(new Error('Load failed'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    await act(async () => {
      await result.current.openEditModal({ id: '1' } as never)
    })
    await waitFor(() => {
      expect(result.current.editorOpen).toBe(false)
    })
    expect(mockShowError).toHaveBeenCalled()
  })

  it('closeEditor closes the editor', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.openCreateModal()
    })
    expect(result.current.editorOpen).toBe(true)
    act(() => {
      result.current.closeEditor()
    })
    expect(result.current.editorOpen).toBe(false)
  })

  it('closeCreateResult closes the result modal', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    act(() => {
      result.current.closeCreateResult()
    })
    expect(result.current.createResultOpen).toBe(false)
    expect(result.current.createResult).toBeNull()
  })

  it('runLoginNameCheck returns available for empty name', async () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('')
    })
    expect(checkResult.available).toBe(true)
    expect(mockCheckUserAccountLoginName).not.toHaveBeenCalled()
  })

  it('runLoginNameCheck calls API for non-empty name', async () => {
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: true,
      message: '',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('testuser')
    })
    expect(checkResult.available).toBe(true)
    expect(mockCheckUserAccountLoginName).toHaveBeenCalledWith(
      'testuser',
      undefined,
    )
  })

  it('runLoginNameCheck handles unavailable name', async () => {
    mockCheckUserAccountLoginName.mockResolvedValue({
      available: false,
      message: 'Name exists',
    })
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('admin')
    })
    expect(checkResult.available).toBe(false)
    expect(result.current.loginNameValidationMessage).toBe('Name exists')
  })

  it('runLoginNameCheck handles error', async () => {
    mockCheckUserAccountLoginName.mockRejectedValue(new Error('Check failed'))
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    const checkResult = await act(async () => {
      return result.current.runLoginNameCheck('testuser')
    })
    expect(checkResult.available).toBe(true)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() =>
      useUserAccountEditor({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current).toHaveProperty('form')
    expect(result.current).toHaveProperty('editorOpen')
    expect(result.current).toHaveProperty('editorMode')
    expect(result.current).toHaveProperty('editorLoading')
    expect(result.current).toHaveProperty('editingId')
    expect(result.current).toHaveProperty('loginNameValidationMessage')
    expect(result.current).toHaveProperty('loginNameChecking')
    expect(result.current).toHaveProperty('departmentOptions')
    expect(result.current).toHaveProperty('roleOptions')
    expect(result.current).toHaveProperty('selectedRoleIds')
    expect(result.current).toHaveProperty('selectedRoleDataScope')
    expect(result.current).toHaveProperty('selectedRoleSummaries')
    expect(result.current).toHaveProperty('createResultOpen')
    expect(result.current).toHaveProperty('createResult')
    expect(result.current).toHaveProperty('savePending')
    expect(result.current).toHaveProperty('openCreateModal')
    expect(result.current).toHaveProperty('openEditModal')
    expect(result.current).toHaveProperty('runLoginNameCheck')
    expect(result.current).toHaveProperty('handleSave')
    expect(result.current).toHaveProperty('closeEditor')
    expect(result.current).toHaveProperty('closeCreateResult')
  })
})
