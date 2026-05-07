import { describe, expect, it } from 'vitest'
import type { MenuNode } from '@/api/system-menus'
import type { MenuGroupKey } from '@/config/navigation-registry'
import type { AppPageDefinition } from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'

const appPageDefinitions: AppPageDefinition[] = [
  {
    key: 'dashboard',
    title: '工作台',
    menuKey: '/dashboard',
    view: 'dashboard',
    icon: 'HomeOutlined',
  },
  {
    key: 'print-templates',
    title: '打印模板',
    menuKey: '/print-templates',
    view: 'print-templates',
    icon: 'PrinterOutlined',
    menuParent: 'system',
  },
  {
    key: 'role-action-editor',
    title: '角色权限配置',
    menuKey: '/role-action-editor',
    view: 'role-action-editor',
    icon: 'SafetyCertificateOutlined',
    menuParent: 'system',
    accessMenuKeys: ['/role-action-editor', '/role-settings'],
  },
]

const menuEntriesByGroup = new Map<MenuGroupKey, AppPageDefinition[]>([
  ['master', []],
  ['purchase', []],
  ['sales', []],
  ['freight', []],
  ['contracts', []],
  ['reports', []],
  ['statements', []],
  ['finance', []],
  [
    'system',
    appPageDefinitions.filter((entry) => entry.menuParent === 'system'),
  ],
])

const systemMenuGroups = {
  system: {
    key: 'system' as const,
    title: '设置',
    icon: 'PrinterOutlined' as const,
  },
}

function buildMenus(systemMenuTree: MenuNode[], allowedMenuCodes: string[]) {
  return buildVisibleLayoutMenuEntries({
    appPageDefinitions,
    defaultIcon: 'AppstoreOutlined',
    getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
    getPageDefinition: (key) =>
      appPageDefinitions.find((entry) => entry.key === key),
    isKnownIconKey: (iconKey): iconKey is AppPageDefinition['icon'] =>
      [
        'HomeOutlined',
        'PrinterOutlined',
        'SafetyCertificateOutlined',
        'AppstoreOutlined',
      ].includes(String(iconKey)),
    menuGroupDefinitions: {
      master: { key: 'master', title: '基础数据', icon: 'AppstoreOutlined' },
      purchase: {
        key: 'purchase',
        title: '采购',
        icon: 'ShoppingCartOutlined',
      },
      sales: { key: 'sales', title: '销售', icon: 'ShopOutlined' },
      freight: { key: 'freight', title: '物流', icon: 'CarOutlined' },
      contracts: {
        key: 'contracts',
        title: '合同',
        icon: 'FileTextOutlined',
      },
      reports: { key: 'reports', title: '报表', icon: 'TableOutlined' },
      statements: {
        key: 'statements',
        title: '对账',
        icon: 'FileTextOutlined',
      },
      finance: { key: 'finance', title: '财务', icon: 'WalletOutlined' },
      system: systemMenuGroups.system,
    },
    menuGroupOrder: [
      'master',
      'purchase',
      'sales',
      'freight',
      'contracts',
      'reports',
      'statements',
      'finance',
      'system',
    ],
    systemMenuTree,
    userCanAccessEntry: (entry) => {
      if (
        Array.isArray(entry.accessMenuKeys) &&
        entry.accessMenuKeys.length > 0
      ) {
        return entry.accessMenuKeys.some((menuKey) =>
          allowedMenuCodes.includes(menuKey.replace(/^\/+/, '')),
        )
      }
      return allowedMenuCodes.includes(entry.key)
    },
    userCanAccessMenuCode: (menuCode) => allowedMenuCodes.includes(menuCode),
  })
}

describe('buildVisibleLayoutMenuEntries', () => {
  it('builds static fallback menus when backend menu tree is empty', () => {
    const visibleMenus = buildMenus([], ['dashboard', 'print-templates'])

    expect(visibleMenus).toMatchObject([
      {
        menuCode: 'dashboard',
        path: '/dashboard',
      },
      {
        menuCode: 'system',
        children: [
          {
            menuCode: 'print-templates',
            path: '/print-templates',
          },
        ],
      },
    ])
  })

  it('keeps backend menus as primary source and appends accessible alias entries', () => {
    const visibleMenus = buildMenus(
      [
        {
          menuCode: 'dashboard',
          menuName: '工作台',
          parentCode: null,
          routePath: '/dashboard',
          icon: 'HomeOutlined',
          sortOrder: 1,
          menuType: '菜单',
          actions: ['read'],
          children: [],
        },
        {
          menuCode: 'system',
          menuName: '设置',
          parentCode: null,
          routePath: null,
          icon: 'PrinterOutlined',
          sortOrder: 2,
          menuType: '目录',
          actions: [],
          children: [],
        },
      ],
      ['dashboard', 'system', 'role-action-editor', 'role-settings'],
    )

    const systemMenu = visibleMenus.find((entry) => entry.menuCode === 'system')

    expect(systemMenu?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuCode: 'role-action-editor',
          path: '/role-action-editor',
        }),
      ]),
    )
  })

  it('shows alias entry when either merged permission menu is granted', () => {
    const visibleMenus = buildMenus(
      [
        {
          menuCode: 'dashboard',
          menuName: '工作台',
          parentCode: null,
          routePath: '/dashboard',
          icon: 'HomeOutlined',
          sortOrder: 1,
          menuType: '菜单',
          actions: ['read'],
          children: [],
        },
        {
          menuCode: 'system',
          menuName: '设置',
          parentCode: null,
          routePath: null,
          icon: 'PrinterOutlined',
          sortOrder: 2,
          menuType: '目录',
          actions: [],
          children: [],
        },
      ],
      ['dashboard', 'system', 'role-action-editor'],
    )

    const systemMenu = visibleMenus.find((entry) => entry.menuCode === 'system')

    expect(systemMenu?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuCode: 'role-action-editor',
          path: '/role-action-editor',
        }),
      ]),
    )
  })
})
