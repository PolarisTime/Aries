import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateRole = vi.fn()
const mockUpdateRole = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockUseMutation = vi.fn()
const mockUseQueryClient = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/role-actions', () => ({
  createRole: (...args: unknown[]) => mockCreateRole(...args),
  updateRole: (...args: unknown[]) => mockUpdateRole(...args),
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusValues: ['enabled', 'disabled'],
  roleDataScopeValues: ['全部数据', '本部门', '本人'],
  roleTypeValues: ['system', 'custom'],
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { roleSettings: ['roleSettings'] },
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

vi.mock('antd/es/form', () => {
  const formInstance = {
    resetFields: vi.fn(),
    setFieldsValue: vi.fn(),
    getFieldValue: vi.fn(),
    getFieldsValue: vi.fn(() => ({})),
    validateFields: vi.fn(),
  }
  return {
    default: {
      useForm: vi.fn(() => [formInstance]),
    },
  }
})

import { useRoleEditor } from '@/views/system/useRoleEditor'

describe('useRoleEditor', () => {
  const mockOnCreatedRoleSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    expect(result.current.roleModalOpen).toBe(false)
    expect(result.current.editingRole).toBeNull()
    expect(result.current.savePending).toBe(false)
  })

  it('returns form instance', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    expect(result.current.roleForm).toBeDefined()
  })

  it('openRoleForm in create mode opens modal', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    act(() => {
      result.current.openRoleForm('create')
    })
    expect(result.current.roleModalOpen).toBe(true)
    expect(result.current.editingRole).toBeNull()
  })

  it('openRoleForm in create mode shows warning when no permission', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: false,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    act(() => {
      result.current.openRoleForm('create')
    })
    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(result.current.roleModalOpen).toBe(false)
  })

  it('openRoleForm in edit mode opens modal with role data', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    const role = {
      id: '1',
      roleName: 'Admin',
      roleCode: 'admin',
      roleType: 'system',
      dataScope: '全部数据',
      remark: 'test',
    }
    act(() => {
      result.current.openRoleForm('edit', role as never)
    })
    expect(result.current.roleModalOpen).toBe(true)
    expect(result.current.editingRole).toEqual(role)
  })

  it('openRoleForm in edit mode shows warning when no permission', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: false,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    act(() => {
      result.current.openRoleForm('edit', { id: '1' } as never)
    })
    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(result.current.roleModalOpen).toBe(false)
  })

  it('closeRoleModal closes the modal', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    act(() => {
      result.current.openRoleForm('create')
    })
    expect(result.current.roleModalOpen).toBe(true)
    act(() => {
      result.current.closeRoleModal()
    })
    expect(result.current.roleModalOpen).toBe(false)
  })

  it('handleSaveRole shows warning when name or code is empty', async () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    await act(async () => {
      await result.current.handleSaveRole()
    })
    expect(mockMessageWarning).toHaveBeenCalled()
  })

  it('returns all expected properties', () => {
    const { result } = renderHook(() =>
      useRoleEditor({
        canCreateRole: true,
        canEditRole: true,
        onCreatedRoleSelect: mockOnCreatedRoleSelect,
      }),
    )
    expect(result.current).toHaveProperty('roleModalOpen')
    expect(result.current).toHaveProperty('editingRole')
    expect(result.current).toHaveProperty('roleForm')
    expect(result.current).toHaveProperty('savePending')
    expect(result.current).toHaveProperty('openRoleForm')
    expect(result.current).toHaveProperty('handleSaveRole')
    expect(result.current).toHaveProperty('closeRoleModal')
  })
})
