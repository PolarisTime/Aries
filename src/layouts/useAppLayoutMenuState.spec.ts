import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAppLayoutMenuState } from '@/layouts/useAppLayoutMenuState'

vi.mock('@/config/navigation-registry', () => ({
  buildMenuEntriesByGroup: vi.fn().mockReturnValue(new Map()),
  menuGroupDefinitions: {},
  menuGroupOrder: [],
}))

vi.mock('@/config/page-registry', () => ({
  appPageDefinitions: [],
  getPageDefinition: vi.fn(),
}))

vi.mock('@/layouts/layout-menu', () => ({
  buildVisibleLayoutMenuEntries: vi.fn().mockReturnValue([
    {
      menuCode: 'dashboard',
      title: '工作台',
      path: '/dashboard',
      icon: 'DashboardOutlined',
      children: [],
    },
    {
      menuCode: 'basic-data',
      title: '基础数据',
      path: null,
      icon: 'DatabaseOutlined',
      children: [
        {
          menuCode: 'material',
          title: '商品资料',
          path: '/material',
          icon: 'ShoppingOutlined',
          children: [],
        },
      ],
    },
  ]),
}))

vi.mock('@/layouts/layout-menu-items', () => ({
  buildMenuPathMap: vi.fn().mockReturnValue({
    '/dashboard': '/dashboard',
    '/material': '/material',
  }),
  buildSideMenuItems: vi.fn().mockReturnValue([]),
  buildTopMenuItems: vi.fn().mockReturnValue([]),
  findMenuParentKeys: vi.fn().mockReturnValue(['basic-data']),
}))

vi.mock('@/stores/permissionStore', () => ({
  checkAccessResources: vi.fn().mockReturnValue(true),
  usePermissionStore: {
    getState: vi.fn().mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    }),
  },
}))

describe('useAppLayoutMenuState', () => {
  const defaultOptions = {
    activeMenuKey: '/dashboard',
    can: vi.fn().mockReturnValue(true),
    collapsed: false,
    menus: [],
  }

  it('returns menu state', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    expect(result.current.sideMenuItems).toBeDefined()
    expect(result.current.topMenuItems).toBeDefined()
    expect(result.current.selectedKeys).toEqual(['/dashboard'])
  })

  it('returns selectedKeys based on activeMenuKey', () => {
    const { result } = renderHook(() =>
      useAppLayoutMenuState({ ...defaultOptions, activeMenuKey: '/material' }),
    )
    expect(result.current.selectedKeys).toEqual(['/material'])
  })

  it('returns empty siderOpenKeys when collapsed', () => {
    const { result } = renderHook(() =>
      useAppLayoutMenuState({ ...defaultOptions, collapsed: true }),
    )
    expect(result.current.siderOpenKeys).toEqual([])
  })

  it('includes parent keys in siderOpenKeys when not collapsed', () => {
    const { result } = renderHook(() =>
      useAppLayoutMenuState({ ...defaultOptions, collapsed: false }),
    )
    expect(result.current.siderOpenKeys).toContain('basic-data')
  })

  it('provides setSiderOpenKeys function', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    expect(typeof result.current.setSiderOpenKeys).toBe('function')
  })

  it('provides resolveMenuPath function', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    expect(result.current.resolveMenuPath('/dashboard')).toBe('/dashboard')
  })

  it('provides visibleMenuEntries', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    expect(result.current.visibleMenuEntries).toHaveLength(2)
  })

  it('provides resolvedSiderOpenKeys', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    expect(result.current.resolvedSiderOpenKeys).toContain('basic-data')
  })

  it('merges manual sider open keys with resolved keys', () => {
    const { result } = renderHook(() => useAppLayoutMenuState(defaultOptions))
    act(() => {
      result.current.setSiderOpenKeys(['manual-group'])
    })
    expect(result.current.siderOpenKeys).toContain('basic-data')
    expect(result.current.siderOpenKeys).toContain('manual-group')
  })

  it('returns empty siderOpenKeys when collapsed even with manual keys', () => {
    const { result } = renderHook(() =>
      useAppLayoutMenuState({ ...defaultOptions, collapsed: true }),
    )
    act(() => {
      result.current.setSiderOpenKeys(['manual-group'])
    })
    expect(result.current.siderOpenKeys).toEqual([])
  })

  it('handles menus from system menu tree', () => {
    const systemMenus = [
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        routePath: '/dashboard',
        icon: 'DashboardOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const { result } = renderHook(() =>
      useAppLayoutMenuState({ ...defaultOptions, menus: systemMenus }),
    )

    expect(result.current.visibleMenuEntries).toBeDefined()
  })
})
