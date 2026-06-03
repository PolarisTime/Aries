import { describe, expect, it } from 'vitest'
import {
  buildMenuPathMap,
  buildSideMenuItems,
  buildTopMenuItems,
  findMenuParentKeys,
} from '@/layouts/layout-menu-items'
import type { LayoutMenuEntry } from '@/layouts/layout-menu'

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
    expect(findMenuParentKeys(sampleEntries, 'material')).toEqual(['basic-data'])
  })

  it('finds nested entry by path', () => {
    expect(findMenuParentKeys(sampleEntries, '/customer')).toEqual(['basic-data'])
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

  it('returns empty array for empty entries', () => {
    expect(buildTopMenuItems([])).toEqual([])
  })
})
