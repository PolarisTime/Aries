import { describe, expect, it } from 'vitest'
import type { LayoutMenuEntry } from '@/layouts/layout-menu'
import {
  buildMenuPathMap,
  buildSideMenuItems,
  buildTopMenuItems,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'

const sampleEntries: LayoutMenuEntry[] = [
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
      {
        menuCode: 'customer',
        title: '客户资料',
        path: '/customer',
        icon: 'UserOutlined',
        children: [],
      },
    ],
  },
]

describe('buildMenuPathMap', () => {
  it('maps path to itself for all entries', () => {
    const pathMap = buildMenuPathMap(sampleEntries)
    expect(pathMap['/dashboard']).toBe('/dashboard')
    expect(pathMap['/material']).toBe('/material')
    expect(pathMap['/customer']).toBe('/customer')
  })

  it('returns empty map for empty entries', () => {
    expect(buildMenuPathMap([])).toEqual({})
  })
})

describe('findMenuParentKeys', () => {
  it('returns empty array when target is a top-level entry', () => {
    expect(findMenuParentKeys(sampleEntries, 'dashboard')).toEqual([])
  })

  it('returns parent keys when target is a nested entry', () => {
    expect(findMenuParentKeys(sampleEntries, 'material')).toEqual([
      'basic-data',
    ])
  })

  it('finds nested entry by path', () => {
    expect(findMenuParentKeys(sampleEntries, '/customer')).toEqual([
      'basic-data',
    ])
  })

  it('returns null when target is not found', () => {
    expect(findMenuParentKeys(sampleEntries, 'nonexistent')).toBeNull()
  })
})

describe('buildSideMenuItems', () => {
  it('builds items from flat entries', () => {
    const items = buildSideMenuItems([sampleEntries[0]])
    expect(items).toHaveLength(1)
    expect(items![0]).toMatchObject({
      key: '/dashboard',
      label: '工作台',
    })
  })

  it('builds grouped items with children', () => {
    const items = buildSideMenuItems(sampleEntries)
    expect(items).toHaveLength(2)

    const groupItem = items![1] as any
    expect(groupItem.key).toBe('basic-data')
    expect(groupItem.children).toHaveLength(2)
    expect(groupItem.children[0].key).toBe('/material')
    expect(groupItem.children[1].key).toBe('/customer')
  })

  it('falls back to menu code and omits unknown icons', () => {
    const entries: LayoutMenuEntry[] = [
      {
        menuCode: 'reports',
        title: '报表',
        path: null,
        icon: 'TableOutlined',
        children: [],
      },
      {
        menuCode: 'unknown-group',
        title: '未知分组',
        path: null,
        icon: 'UnknownOutlined',
        children: [
          {
            menuCode: 'unknown-child',
            title: '未知子菜单',
            path: null,
            icon: 'UnknownOutlined',
            children: [],
          },
        ],
      },
    ]

    const items = buildSideMenuItems(entries)
    expect(items).toHaveLength(2)

    const leafItem = items![0] as any
    expect(leafItem.key).toBe('reports')
    expect(leafItem.icon).toBeDefined()

    const groupItem = items![1] as any
    expect(groupItem.icon).toBeUndefined()
    expect(groupItem.children[0]).toMatchObject({
      key: 'unknown-child',
      icon: undefined,
      label: '未知子菜单',
    })
  })

  it('returns empty array for empty entries', () => {
    expect(buildSideMenuItems([])).toEqual([])
  })
})

describe('buildTopMenuItems', () => {
  it('builds items without children for leaf entries', () => {
    const items = buildTopMenuItems([sampleEntries[0]])
    expect(items).toHaveLength(1)
    expect(items![0]).toMatchObject({
      key: '/dashboard',
      label: '工作台',
    })
    expect((items![0] as any).children).toBeUndefined()
  })

  it('builds items with children for grouped entries', () => {
    const items = buildTopMenuItems(sampleEntries)
    const groupItem = items![1] as any
    expect(groupItem.key).toBe('basic-data')
    expect(groupItem.children).toHaveLength(2)
  })

  it('falls back to menu code for child entries without path', () => {
    const items = buildTopMenuItems([
      {
        menuCode: 'reports',
        title: '报表',
        path: null,
        icon: 'TableOutlined',
        children: [
          {
            menuCode: 'monthly-report',
            title: '月报',
            path: null,
            icon: 'TableOutlined',
            children: [],
          },
        ],
      },
    ])

    const groupItem = items![0] as any
    expect(groupItem.key).toBe('reports')
    expect(groupItem.children[0].key).toBe('monthly-report')
  })

  it('returns empty array for empty entries', () => {
    expect(buildTopMenuItems([])).toEqual([])
  })
})
