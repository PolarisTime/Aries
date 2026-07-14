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
  ALL_ROLE_ACTIONS: ['create', 'read', 'update', 'delete', 'archive'],
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
  buildRoleMatrixData: vi.fn(
    (
      menus: Array<{
        menuCode: string
        menuName?: string
        resource: string
        actions: string[]
      }>,
      selectedActions: Set<string>,
    ) =>
      menus.map((menu) => ({
        menuCode: menu.menuCode,
        menuName: menu.menuName ?? menu.menuCode,
        actions: menu.actions,
        _count: menu.actions.filter((action) =>
          selectedActions.has(`${menu.resource}:${action}`),
        ).length,
        ...Object.fromEntries(
          menu.actions.map((action) => [
            action,
            selectedActions.has(`${menu.resource}:${action}`),
          ]),
        ),
      })),
  ),
  flattenRoleActionMenus: vi.fn((menus: unknown[]) =>
    menus.flatMap((menu) => {
      const item = menu as {
        menuCode: string
        menuName?: string
        resource?: string
        resourceCode?: string
        actions?: string[]
        children?: unknown[]
      }
      return [
        {
          menuCode: item.menuCode,
          menuName: item.menuName ?? item.menuCode,
          resource: item.resource ?? item.resourceCode ?? item.menuCode,
          actions: item.actions ?? [],
        },
        ...((item.children ?? []) as unknown[]).map((child) => {
          const childItem = child as {
            menuCode: string
            menuName?: string
            resource?: string
            resourceCode?: string
            actions?: string[]
          }
          return {
            menuCode: childItem.menuCode,
            menuName: childItem.menuName ?? childItem.menuCode,
            resource:
              childItem.resource ??
              childItem.resourceCode ??
              childItem.menuCode,
            actions: childItem.actions ?? [],
          }
        }),
      ]
    }),
  ),
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
    mockUseMutation.mockImplementation((options) => ({
      mutate: () => {
        void Promise.resolve()
          .then(() => options.mutationFn())
          .then(() => options.onSuccess?.())
          .catch((error) => options.onError?.(error))
      },
      isPending: false,
    }))
    mockUseQuery.mockReturnValue({
      data: [
        {
          menuCode: 'system',
          menuName: '系统',
          resource: 'system',
          actions: ['read', 'update'],
          children: [
            {
              menuCode: 'users',
              menuName: '用户',
              resource: 'users',
              actions: ['read', 'delete'],
            },
          ],
        },
      ],
    })
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

  it('tracks selected actions through role action queries', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })

    expect(result.current.isMenuChecked('system')).toBe(true)
    expect(
      result.current.isMenuPartiallyChecked({
        menuCode: 'system',
        resourceCode: 'system',
        actions: ['read', 'update'],
      } as never),
    ).toBe(true)
    expect(result.current.isActionSelected('system', 'read')).toBe(true)
    expect(result.current.isActionSelected('system', 'update')).toBe(false)
  })

  it('toggles a single action using menu resource lookup', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    act(() => {
      result.current.toggleAction('users', 'delete')
    })

    expect(result.current.isActionSelected('users', 'delete')).toBe(true)

    act(() => {
      result.current.toggleAction('users', 'delete')
    })

    expect(result.current.isActionSelected('users', 'delete')).toBe(false)
  })

  it('falls back to menu code when resource lookup is missing', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })

    expect(result.current.isMenuChecked('users')).toBe(false)

    act(() => {
      result.current.toggleAction('audit', 'read')
    })

    expect(result.current.isMenuChecked('audit')).toBe(true)
    expect(result.current.isActionSelected('audit', 'read')).toBe(true)
    expect(
      result.current.isMenuPartiallyChecked({
        menuCode: 'audit',
        actions: ['read'],
      } as never),
    ).toBe(false)
  })

  it('toggles all actions for a menu', async () => {
    const menu = {
      menuCode: 'system',
      resourceCode: 'system',
      actions: ['read', 'update'],
    }
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    act(() => {
      result.current.toggleAllMenuActions(menu as never)
    })

    expect(result.current.isActionSelected('system', 'read')).toBe(true)
    expect(result.current.isActionSelected('system', 'update')).toBe(true)

    act(() => {
      result.current.toggleAllMenuActions(menu as never)
    })

    expect(result.current.isActionSelected('system', 'read')).toBe(false)
    expect(result.current.isActionSelected('system', 'update')).toBe(false)
  })

  it('toggles all actions using menu code when resourceCode is absent', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    act(() => {
      result.current.toggleAllMenuActions({
        menuCode: 'audit',
        actions: ['read'],
      } as never)
    })

    expect(result.current.isActionSelected('audit', 'read')).toBe(true)
  })

  it('selects and clears all flattened menu actions', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.isActionSelected('system', 'read')).toBe(true)
    expect(result.current.isActionSelected('users', 'delete')).toBe(true)

    act(() => {
      result.current.deselectAll()
    })

    expect(result.current.isMenuChecked('system')).toBe(false)
    expect(result.current.isActionSelected('users', 'delete')).toBe(false)
  })

  it('builds matrix columns only for supported actions and renders cells', () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    const actionColumn = result.current.matrixColumns.find(
      (column) => column.dataIndex === 'read',
    )
    const unsupportedColumn = result.current.matrixColumns.find(
      (column) => column.dataIndex === 'create',
    )
    const countColumn = result.current.matrixColumns.find(
      (column) => column.dataIndex === '_count',
    )

    expect(actionColumn).toBeDefined()
    expect(unsupportedColumn).toBeUndefined()
    expect(countColumn).toBeDefined()
    expect(result.current.matrixData).toHaveLength(2)

    const disabledCell = actionColumn?.render?.(
      true,
      {
        menuCode: 'system',
        actions: ['update'],
      } as never,
      0,
    )
    const checkboxCell = actionColumn?.render?.(
      true,
      {
        menuCode: 'system',
        actions: ['read'],
      } as never,
      0,
    )

    expect(disabledCell).toBeDefined()
    expect(checkboxCell).toBeDefined()
  })

  it('renders fallback matrix titles and toggles from checkbox cells', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          menuCode: 'archive-menu',
          menuName: '归档',
          resource: 'archive-resource',
          actions: ['archive'],
        },
      ],
    })

    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    const archiveColumn = result.current.matrixColumns.find(
      (column) => column.dataIndex === 'archive',
    )
    const checkboxCell = archiveColumn?.render?.(
      false,
      {
        menuCode: 'archive-menu',
        actions: ['archive'],
      } as never,
      0,
    ) as { props: { onChange: () => void } }

    expect(archiveColumn?.title).toBe('archive')

    act(() => {
      checkboxCell.props.onChange()
    })

    expect(result.current.isActionSelected('archive-menu', 'archive')).toBe(
      true,
    )
  })

  it('saves selected role actions and invalidates options', async () => {
    const invalidateQueries = vi.fn()
    mockUseQueryClient.mockReturnValue({ invalidateQueries })
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    act(() => {
      result.current.toggleAction('users', 'delete')
    })
    act(() => {
      result.current.saveRoleActions()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockUpdateRoleActions).toHaveBeenCalledWith(
      '1',
      expect.arrayContaining([
        { resource: 'system', action: 'read' },
        { resource: 'users', action: 'delete' },
      ]),
    )
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rolePermissionOptions'],
    })
  })

  it('ignores save when no role is selected', async () => {
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    act(() => {
      result.current.saveRoleActions()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockUpdateRoleActions).not.toHaveBeenCalled()
  })

  it('shows request error when save fails', async () => {
    mockUpdateRoleActions.mockRejectedValue(new Error('save failed'))
    const { result } = renderHook(() =>
      useRoleActionPermissions({ roles, canEditPermissions: true }),
    )

    await act(async () => {
      await result.current.selectRole(roles[0] as never)
    })
    act(() => {
      result.current.saveRoleActions()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockShowError).toHaveBeenCalled()
  })
})
