import { describe, expect, it } from 'vitest'
import type { AppPageDefinition } from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'

function page(overrides: Partial<AppPageDefinition>): AppPageDefinition {
  return {
    key: 'page',
    title: '页面',
    menuKey: '/page',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    ...overrides,
  }
}

const baseOptions = {
  getMenuEntriesByGroup: () => [] as AppPageDefinition[],
  menuGroupDefinitions: {},
  menuGroupOrder: [],
} as unknown as Parameters<typeof buildVisibleLayoutMenuEntries>[0]

describe('buildVisibleLayoutMenuEntries', () => {
  it('缺省不传 canAccessPage 时全部可见', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...baseOptions,
      appPageDefinitions: [page({ key: 'a' }), page({ key: 'b' })],
    })
    expect(entries.map((entry) => entry.menuCode)).toEqual(['a', 'b'])
  })

  it('canAccessPage 返回 false 的页面被过滤', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...baseOptions,
      appPageDefinitions: [
        page({ key: 'role', requiredPermission: 'roles:read' }),
        page({ key: 'user', requiredPermission: 'user-accounts:read' }),
      ],
      canAccessPage: (entry) =>
        entry.requiredPermission !== 'user-accounts:read',
    })
    expect(entries.map((entry) => entry.menuCode)).toEqual(['role'])
  })

  it('hiddenInMenu 的页面不进入菜单（保留路由定义）', () => {
    const entries = buildVisibleLayoutMenuEntries({
      ...baseOptions,
      appPageDefinitions: [
        page({ key: 'visible' }),
        page({ key: 'hidden', hiddenInMenu: true }),
      ],
    })
    expect(entries.map((entry) => entry.menuCode)).toEqual(['visible'])
  })
})
