import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import {
  buildMenuPathMap,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'
import { useAppLayoutMenuState } from '@/layouts/useAppLayoutMenuState'
import {
  checkAccessResources,
  usePermissionStore,
} from '@/stores/permissionStore'

const mocks = vi.hoisted(() => {
  const canMock = vi.fn(() => true)
  const menuEntriesByGroup = new Map<string, unknown[]>([
    ['known-group', [{ key: 'known-entry' }]],
  ])
  const visibleMenuEntries = [
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
  ]

  return {
    buildMenuEntriesByGroupMock: vi.fn(() => menuEntriesByGroup),
    buildMenuPathMapMock: vi.fn(() => ({
      '/dashboard': '/dashboard',
      '/material': '/material',
    })),
    buildSideMenuItemsMock: vi.fn(() => []),
    buildTopMenuItemsMock: vi.fn(() => []),
    buildVisibleLayoutMenuEntriesMock: vi.fn(() => visibleMenuEntries),
    canMock,
    checkAccessResourcesMock: vi.fn(() => true),
    findMenuParentKeysMock: vi.fn(() => ['basic-data']),
    getPageDefinitionMock: vi.fn(),
    menuEntriesByGroup,
    visibleMenuEntries,
  }
})

vi.mock('@/config/navigation-registry', () => ({
  buildMenuEntriesByGroup: mocks.buildMenuEntriesByGroupMock,
  menuGroupDefinitions: {},
  menuGroupOrder: [],
}))

vi.mock('@/config/page-registry', () => ({
  appPageDefinitions: [],
  getPageDefinition: mocks.getPageDefinitionMock,
}))

vi.mock('@/layouts/layout-menu', () => ({
  buildVisibleLayoutMenuEntries: mocks.buildVisibleLayoutMenuEntriesMock,
}))

vi.mock('@/layouts/layout-menu-items', () => ({
  buildMenuPathMap: mocks.buildMenuPathMapMock,
  buildSideMenuItems: mocks.buildSideMenuItemsMock,
  buildTopMenuItems: mocks.buildTopMenuItemsMock,
  findMenuParentKeys: mocks.findMenuParentKeysMock,
}))

vi.mock('@/stores/permissionStore', () => ({
  checkAccessResources: mocks.checkAccessResourcesMock,
  usePermissionStore: {
    getState: vi.fn(() => ({
      can: mocks.canMock,
    })),
  },
}))

describe('useAppLayoutMenuState', () => {
  const defaultOptions = {
    activeMenuKey: '/dashboard',
    can: vi.fn(() => true),
    collapsed: false,
    menus: [],
  }

  const renderMenuState = (
    options: Parameters<typeof useAppLayoutMenuState>[0] = defaultOptions,
  ) => renderHook(() => useAppLayoutMenuState(options))

  const latestVisibleMenuOptions = () =>
    vi.mocked(buildVisibleLayoutMenuEntries).mock.calls.at(-1)?.[0]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.buildMenuPathMapMock.mockReturnValue({
      '/dashboard': '/dashboard',
      '/material': '/material',
    })
    mocks.buildVisibleLayoutMenuEntriesMock.mockReturnValue(
      mocks.visibleMenuEntries,
    )
    mocks.canMock.mockReturnValue(true)
    mocks.checkAccessResourcesMock.mockReturnValue(true)
    mocks.findMenuParentKeysMock.mockReturnValue(['basic-data'])
  })

  it('returns menu state', () => {
    const { result } = renderMenuState()

    expect(result.current.sideMenuItems).toBeDefined()
    expect(result.current.topMenuItems).toBeDefined()
    expect(result.current.selectedKeys).toEqual(['/dashboard'])
  })

  it('returns selectedKeys based on activeMenuKey', () => {
    const { result } = renderMenuState({
      ...defaultOptions,
      activeMenuKey: '/material',
    })

    expect(result.current.selectedKeys).toEqual(['/material'])
  })

  it('returns empty siderOpenKeys when collapsed', () => {
    const { result } = renderMenuState({ ...defaultOptions, collapsed: true })

    expect(result.current.siderOpenKeys).toEqual([])
  })

  it('includes parent keys in siderOpenKeys when not collapsed', () => {
    const { result } = renderMenuState({
      ...defaultOptions,
      collapsed: false,
    })

    expect(result.current.siderOpenKeys).toContain('basic-data')
  })

  it('provides setSiderOpenKeys function', () => {
    const { result } = renderMenuState()

    expect(typeof result.current.setSiderOpenKeys).toBe('function')
  })

  it('provides resolveMenuPath function', () => {
    const { result } = renderMenuState()

    expect(result.current.resolveMenuPath('/dashboard')).toBe('/dashboard')
  })

  it('returns undefined when resolveMenuPath misses', () => {
    const { result } = renderMenuState()

    expect(result.current.resolveMenuPath('/missing')).toBeUndefined()
  })

  it('provides visibleMenuEntries', () => {
    const { result } = renderMenuState()

    expect(result.current.visibleMenuEntries).toHaveLength(2)
  })

  it('provides resolvedSiderOpenKeys', () => {
    const { result } = renderMenuState()

    expect(result.current.resolvedSiderOpenKeys).toContain('basic-data')
  })

  it('falls back to empty parent keys when no menu parent is found', () => {
    vi.mocked(findMenuParentKeys).mockReturnValueOnce(undefined)

    const { result } = renderMenuState()

    expect(result.current.resolvedSiderOpenKeys).toEqual([])
    expect(result.current.siderOpenKeys).toEqual([])
  })

  it('merges manual sider open keys with resolved keys and deduplicates them', () => {
    const { result } = renderMenuState()

    act(() => {
      result.current.setSiderOpenKeys(['basic-data', 'manual-group'])
    })

    expect(result.current.siderOpenKeys).toEqual(['basic-data', 'manual-group'])
  })

  it('returns empty siderOpenKeys when collapsed even with manual keys', () => {
    const { result } = renderMenuState({ ...defaultOptions, collapsed: true })

    act(() => {
      result.current.setSiderOpenKeys(['manual-group'])
    })

    expect(result.current.siderOpenKeys).toEqual([])
  })

  it('passes system menus into visible menu builder', () => {
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

    renderMenuState({ ...defaultOptions, menus: systemMenus })

    expect(latestVisibleMenuOptions()?.systemMenuTree).toBe(systemMenus)
  })

  it('resolves group entries and falls back to an empty group', () => {
    renderMenuState()
    const options = latestVisibleMenuOptions()

    expect(options?.getMenuEntriesByGroup('known-group')).toEqual([
      { key: 'known-entry' },
    ])
    expect(options?.getMenuEntriesByGroup('missing-group')).toEqual([])
  })

  it('checks accessResources before single resource permissions', () => {
    renderMenuState()
    const options = latestVisibleMenuOptions()
    const accessResources = [{ resource: 'dashboard', action: 'read' }]

    expect(
      options?.userCanAccessEntry({
        key: 'dashboard',
        accessResources,
      } as never),
    ).toBe(true)
    expect(checkAccessResources).toHaveBeenCalledWith(
      accessResources,
      mocks.canMock,
    )
    expect(usePermissionStore.getState).toHaveBeenCalled()
  })

  it('checks resourceKey and falls back to entry key for single permissions', () => {
    renderMenuState()
    const options = latestVisibleMenuOptions()

    expect(
      options?.userCanAccessEntry({
        key: 'dashboard-key',
        resourceKey: 'dashboard-resource',
      } as never),
    ).toBe(true)
    expect(mocks.canMock).toHaveBeenLastCalledWith('dashboard-resource', 'read')

    expect(
      options?.userCanAccessEntry({
        key: 'fallback-key',
        accessResources: [],
      } as never),
    ).toBe(true)
    expect(mocks.canMock).toHaveBeenLastCalledWith('fallback-key', 'read')
  })

  it('checks menu resourceCode and falls back to menuCode', () => {
    const can = vi.fn(() => true)

    renderMenuState({ ...defaultOptions, can })
    const options = latestVisibleMenuOptions()

    expect(options?.userCanAccessMenuCode('resource-code', 'menu-code')).toBe(
      true,
    )
    expect(can).toHaveBeenLastCalledWith('resource-code', 'read')

    expect(options?.userCanAccessMenuCode('', 'menu-code')).toBe(true)
    expect(can).toHaveBeenLastCalledWith('menu-code', 'read')
  })

  it('builds menu items and path map from visible menu entries', () => {
    const { result } = renderMenuState()

    expect(buildMenuPathMap).toHaveBeenCalledWith(mocks.visibleMenuEntries)
    expect(result.current.visibleMenuEntries).toBe(mocks.visibleMenuEntries)
  })
})
