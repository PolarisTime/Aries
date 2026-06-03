import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetRoleActions = vi.fn()
const mockListSystemMenus = vi.fn()
const mockUpdateRoleActions = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockUseMutation = vi.fn()
const mockUseQuery = vi.fn()
const mockUseQueryClient = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/api/role-actions', () => ({
  getRoleActions: (...args: unknown[]) => mockGetRoleActions(...args),
  listSystemMenus: (...args: unknown[]) => mockListSystemMenus(...args),
  updateRoleActions: (...args: unknown[]) => mockUpdateRoleActions(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { rolePermissionOptions: ['rolePermissionOptions'] },
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

vi.mock('@/utils/type-narrowing', () => ({
  asArray: (v: unknown) => (Array.isArray(v) ? v : []),
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/views/system/role-action-view-utils', () => ({
  ALL_ROLE_ACTIONS: ['create', 'read', 'update', 'delete'],
  ROLE_ACTION_LABELS: {
    create: '新增',
    read: '查看',
    update: '编辑',
    delete: '删除',
  },
  buildNormalizedRoleActionSet: vi.fn((data: unknown) => {
    if (Array.isArray(data)) {
      return new Set(
        data.map(
          (item: { resource: string; action: string }) =>
            `${item.resource}:${item.action}`,
        ),
      )
    }
    return new Set()
  }),
  buildRoleMatrixData: vi.fn(() => []),
  flattenRoleActionMenus: vi.fn(() => []),
}))

import { useRoleActionPermissions } from '@/views/system/useRoleActionPermissions'

describe('useRoleActionPermissions', () => {
  const roles = [
    { id: '1', roleName: 'Admin', roleCode: 'admin' },
    { id: '2', roleName: 'User', roleCode: 'user' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
    mockUseQuery.mockReturnValue({ data: [] })
    mockListSystemMenus.mockResolvedValue([
      {
        menuCode: 'system',
        resource: 'system',
        actions: ['read', 'update'],
        children: [],
      },
    ])
    mockGetRoleActions.mockResolvedValue([
      { resource: 'system', action: 'read' },
    ])
    mockUpdateRoleActions.mockResolvedValue(undefined)
  })

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    expect(result.current.selectedRoleId).toBeNull()
    expect(result.current.viewMode).toBe('list')
    expect(result.current.savePending).toBe(false)
  })

  it('returns all expected functions', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    expect(typeof result.current.selectRole).toBe('function')
    expect(typeof result.current.selectAll).toBe('function')
    expect(typeof result.current.deselectAll).toBe('function')
    expect(typeof result.current.saveRoleActions).toBe('function')
    expect(typeof result.current.isMenuChecked).toBe('function')
    expect(typeof result.current.isMenuPartiallyChecked).toBe('function')
    expect(typeof result.current.isActionSelected).toBe('function')
    expect(typeof result.current.toggleAllMenuActions).toBe('function')
    expect(typeof result.current.toggleAction).toBe('function')
  })

  it('selectRole sets selectedRoleId and fetches actions', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    expect(result.current.selectedRoleId).toBe('1')
    expect(mockGetRoleActions).toHaveBeenCalledWith('1')
  })

  it('selectRole handles error', async () => {
    mockGetRoleActions.mockRejectedValue(new Error('Load failed'))
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    expect(result.current.selectedRoleId).toBe('1')
    expect(mockShowError).toHaveBeenCalled()
  })

  it('setViewMode updates viewMode', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    act(() => {
      result.current.setViewMode('matrix')
    })
    expect(result.current.viewMode).toBe('matrix')
  })

  it('selectAll shows warning when no edit permission', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: false }),
    )
    act(() => {
      result.current.selectAll()
    })
    expect(mockMessageWarning).toHaveBeenCalled()
  })

  it('deselectAll shows warning when no edit permission', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: false }),
    )
    act(() => {
      result.current.deselectAll()
    })
    expect(mockMessageWarning).toHaveBeenCalled()
  })

  it('toggleAction shows warning when no edit permission', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: false }),
    )
    act(() => {
      result.current.toggleAction('system', 'read')
    })
    expect(mockMessageWarning).toHaveBeenCalled()
  })

  it('toggleAllMenuActions shows warning when no edit permission', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: false }),
    )
    act(() => {
      result.current.toggleAllMenuActions({
        menuCode: 'system',
        resourceCode: 'system',
        actions: ['read', 'update'],
      } as never)
    })
    expect(mockMessageWarning).toHaveBeenCalled()
  })

  it('does not fetch menus when enabled is false', () => {
    renderHook(() =>
      useRoleActionPermissions({
        roles,
        canEditPermissions: true,
        enabled: false,
      }),
    )
    expect(mockListSystemMenus).not.toHaveBeenCalled()
  })

  it('returns selectedRoleInfo based on selectedRoleId', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    expect(result.current.selectedRoleInfo).toEqual(roles[0])
  })

  it('returns actionLabels', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    expect(result.current.actionLabels).toBeDefined()
  })

  it('returns matrixColumns and matrixData', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )
    expect(Array.isArray(result.current.matrixColumns)).toBe(true)
    expect(Array.isArray(result.current.matrixData)).toBe(true)
  })
})
