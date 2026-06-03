import { describe, expect, it, vi } from 'vitest'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import type { AppPageDefinition } from '@/config/page-registry'
import type { MenuGroupKey, MenuGroupDefinition, AppIconKey } from '@/config/navigation-registry'
import type { MenuNode } from '@/api/system-menus'

const sampleEntries: AppPageDefinition[] = [
  {
    key: 'dashboard',
    title: '工作台',
    menuKey: '/dashboard',
    icon: 'DashboardOutlined' as AppIconKey,
    resourceKey: 'dashboard',
    hiddenInMenu: false,
  },
  {
    key: 'material',
    title: '商品资料',
    menuKey: '/material',
    icon: 'ShoppingOutlined' as AppIconKey,
    resourceKey: 'material',
    hiddenInMenu: false,
  },
  {
    key: 'hidden-page',
    title: '隐藏页面',
    menuKey: '/hidden',
    icon: 'EyeInvisibleOutlined' as AppIconKey,
    resourceKey: 'hidden',
    hiddenInMenu: true,
  },
]

const menuGroupDefinitions: Record<MenuGroupKey, MenuGroupDefinition> = {
  basic: { key: 'basic', title: '基础数据', icon: 'DatabaseOutlined' as AppIconKey },
}

const defaultOptions = {
  appPageDefinitions: sampleEntries,
  defaultIcon: 'AppstoreOutlined' as AppIconKey,
  getMenuEntriesByGroup: (_groupKey: MenuGroupKey) => sampleEntries,
  getPageDefinition: (key: string) => sampleEntries.find((e) => e.key === key),
  isKnownIconKey: vi.fn().mockReturnValue(true),
  menuGroupDefinitions,
  menuGroupOrder: ['basic' as MenuGroupKey],
  systemMenuTree: [] as MenuNode[],
  userCanAccessEntry: vi.fn().mockReturnValue(true),
  userCanAccessMenuCode: vi.fn().mockReturnValue(true),
}

describe('buildVisibleLayoutMenuEntries', () => {
  it('falls back to static menu when systemMenuTree is empty', () => {
    const entries = buildVisibleLayoutMenuEntries(defaultOptions)
    expect(entries.length).toBeGreaterThan(0)
    const codes = entries.map((e) => e.menuCode)
    expect(codes).toContain('dashboard')
  })

  it('hides entries with hiddenInMenu=true', () => {
    const entries = buildVisibleLayoutMenuEntries(defaultOptions)
    const codes = entries.map((e) => e.menuCode)
    expect(codes).not.toContain('hidden-page')
  })

  it('filters out inaccessible entries', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      userCanAccessEntry: vi.fn().mockReturnValue(false),
    })
    expect(entries).toHaveLength(0)
  })

  it('builds entries from system menu tree when provided', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        routePath: '/dashboard',
        icon: 'DashboardOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      userCanAccessEntry: vi.fn().mockReturnValue(true),
      userCanAccessMenuCode: vi.fn().mockReturnValue(true),
      isKnownIconKey: vi.fn().mockReturnValue(true),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].menuCode).toBe('dashboard')
    expect(entries[0].title).toBe('工作台')
  })

  it('returns empty array when no entries are accessible', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      userCanAccessEntry: vi.fn().mockReturnValue(false),
      userCanAccessMenuCode: vi.fn().mockReturnValue(false),
    })
    expect(entries).toHaveLength(0)
  })

  it('resolves entry path without leading slash', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [
        {
          key: 'no-slash',
          title: '无斜杠',
          menuKey: 'no-slash-path',
          icon: 'DashboardOutlined' as AppIconKey,
          resourceKey: 'no-slash',
          hiddenInMenu: false,
        },
      ],
    })
    expect(entries[0].path).toBe('/no-slash-path')
  })

  it('handles system menu tree with null routePath', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'parent',
        menuName: '父菜单',
        routePath: null,
        icon: 'FolderOutlined',
        resourceCode: null,
        children: [
          {
            menuCode: 'child',
            menuName: '子菜单',
            routePath: '/child',
            icon: 'FileOutlined',
            resourceCode: null,
            children: [],
          },
        ],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].path).toBeNull()
    expect(entries[0].children).toHaveLength(1)
    expect(entries[0].children[0].path).toBe('/child')
  })

  it('filters out hidden entries from system menu tree', () => {
    const hiddenPage: AppPageDefinition = {
      key: 'hidden-child',
      title: '隐藏子菜单',
      menuKey: '/hidden-child',
      icon: 'EyeInvisibleOutlined' as AppIconKey,
      resourceKey: 'hidden-child',
      hiddenInMenu: true,
    }

    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'hidden-child',
        menuName: '隐藏子菜单',
        routePath: '/hidden-child',
        icon: 'EyeInvisibleOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [...sampleEntries, hiddenPage],
      systemMenuTree,
      getPageDefinition: (key: string) =>
        [...sampleEntries, hiddenPage].find((e) => e.key === key),
    })

    expect(entries).toHaveLength(0)
  })

  it('uses fallback icon when system menu icon is unknown', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        routePath: '/dashboard',
        icon: 'UnknownIcon',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      isKnownIconKey: vi.fn().mockReturnValue(false),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].icon).toBe('DashboardOutlined')
  })

  it('uses default icon when system menu icon is unknown and no page match', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'unknown-page',
        menuName: '未知页面',
        routePath: '/unknown',
        icon: 'UnknownIcon',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      isKnownIconKey: vi.fn().mockReturnValue(false),
      getPageDefinition: vi.fn().mockReturnValue(undefined),
      userCanAccessMenuCode: vi.fn().mockReturnValue(true),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].icon).toBe('AppstoreOutlined')
  })

  it('uses userCanAccessMenuCode when no page definition found', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'menu-only',
        menuName: '仅菜单',
        routePath: '/menu-only',
        icon: 'DashboardOutlined',
        resourceCode: 'res-code',
        children: [],
      },
    ]

    const userCanAccessMenuCode = vi.fn().mockReturnValue(true)

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      getPageDefinition: vi.fn().mockReturnValue(undefined),
      userCanAccessMenuCode,
    })

    expect(entries).toHaveLength(1)
    expect(userCanAccessMenuCode).toHaveBeenCalledWith('res-code', 'menu-only')
  })

  it('hides node when cannot access and has no children', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'restricted',
        menuName: '受限页面',
        routePath: '/restricted',
        icon: 'DashboardOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      getPageDefinition: vi.fn().mockReturnValue(undefined),
      userCanAccessMenuCode: vi.fn().mockReturnValue(false),
    })

    expect(entries).toHaveLength(0)
  })

  it('appends alias entries with accessMenuKeys', () => {
    const aliasEntry: AppPageDefinition = {
      key: 'alias-page',
      title: '别名页面',
      menuKey: '/alias',
      icon: 'LinkOutlined' as AppIconKey,
      resourceKey: 'alias',
      hiddenInMenu: false,
      accessMenuKeys: ['dashboard'],
    }

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [...sampleEntries, aliasEntry],
      systemMenuTree: [],
    })

    const codes = entries.map((e) => e.menuCode)
    expect(codes).toContain('alias-page')
  })

  it('skips alias entry when path already exists in menu tree', () => {
    const aliasEntry: AppPageDefinition = {
      key: 'alias-dashboard',
      title: '别名工作台',
      menuKey: '/dashboard',
      icon: 'LinkOutlined' as AppIconKey,
      resourceKey: 'alias-dash',
      hiddenInMenu: false,
      accessMenuKeys: ['dashboard'],
    }

    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        routePath: '/dashboard',
        icon: 'DashboardOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [...sampleEntries, aliasEntry],
      systemMenuTree,
    })

    const dashboardEntries = entries.filter((e) => e.path === '/dashboard')
    expect(dashboardEntries).toHaveLength(1)
  })

  it('places alias entry under parent when menuParent matches', () => {
    const parentEntry: AppPageDefinition = {
      key: 'parent-menu',
      title: '父菜单',
      menuKey: '/parent-menu',
      icon: 'FolderOutlined' as AppIconKey,
      resourceKey: 'parent-menu',
      hiddenInMenu: false,
    }

    const childAlias: AppPageDefinition = {
      key: 'child-alias',
      title: '子别名',
      menuKey: '/child-alias',
      icon: 'LinkOutlined' as AppIconKey,
      resourceKey: 'child-alias',
      hiddenInMenu: false,
      menuParent: 'parent-menu',
      accessMenuKeys: ['some-key'],
    }

    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'parent-menu',
        menuName: '父菜单',
        routePath: '/parent-menu',
        icon: 'FolderOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [parentEntry, childAlias],
      systemMenuTree,
    })

    const parent = entries.find((e) => e.menuCode === 'parent-menu')
    expect(parent).toBeDefined()
    expect(parent!.children.some((c) => c.menuCode === 'child-alias')).toBe(
      true,
    )
  })

  it('appends alias to root when parent not found', () => {
    const orphanAlias: AppPageDefinition = {
      key: 'orphan-alias',
      title: '孤立别名',
      menuKey: '/orphan',
      icon: 'LinkOutlined' as AppIconKey,
      resourceKey: 'orphan',
      hiddenInMenu: false,
      menuParent: 'nonexistent-parent',
      accessMenuKeys: ['some-key'],
    }

    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        routePath: '/dashboard',
        icon: 'DashboardOutlined',
        resourceCode: null,
        children: [],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [...sampleEntries, orphanAlias],
      systemMenuTree,
    })

    const codes = entries.map((e) => e.menuCode)
    expect(codes).toContain('orphan-alias')
  })

  it('skips entries without accessMenuKeys or accessResources for alias', () => {
    const normalEntry: AppPageDefinition = {
      key: 'normal-entry',
      title: '普通页面',
      menuKey: '/normal',
      icon: 'DashboardOutlined' as AppIconKey,
      resourceKey: 'normal',
      hiddenInMenu: false,
    }

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [normalEntry],
      systemMenuTree: [],
    })

    const normalEntries = entries.filter((e) => e.menuCode === 'normal-entry')
    expect(normalEntries).toHaveLength(1)
  })

  it('appends alias entry with accessResources', () => {
    const aliasEntry: AppPageDefinition = {
      key: 'resource-alias',
      title: '资源别名',
      menuKey: '/resource-alias',
      icon: 'LinkOutlined' as AppIconKey,
      resourceKey: 'resource-alias',
      hiddenInMenu: false,
      accessResources: ['some-resource'],
    }

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      appPageDefinitions: [...sampleEntries, aliasEntry],
      systemMenuTree: [],
    })

    const codes = entries.map((e) => e.menuCode)
    expect(codes).toContain('resource-alias')
  })

  it('handles system menu tree with multiple levels', () => {
    const systemMenuTree: MenuNode[] = [
      {
        menuCode: 'level1',
        menuName: '一级菜单',
        routePath: null,
        icon: 'FolderOutlined',
        resourceCode: null,
        children: [
          {
            menuCode: 'level2',
            menuName: '二级菜单',
            routePath: null,
            icon: 'FolderOutlined',
            resourceCode: null,
            children: [
              {
                menuCode: 'level3',
                menuName: '三级菜单',
                routePath: '/level3',
                icon: 'FileOutlined',
                resourceCode: null,
                children: [],
              },
            ],
          },
        ],
      },
    ]

    const entries = buildVisibleLayoutMenuEntries({
      ...defaultOptions,
      systemMenuTree,
      getPageDefinition: vi.fn().mockReturnValue(undefined),
      userCanAccessMenuCode: vi.fn().mockReturnValue(true),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].children).toHaveLength(1)
    expect(entries[0].children[0].children).toHaveLength(1)
  })
})
