import { describe, expect, it } from 'vitest'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import { appPageDefinitions, getPageRoutePath } from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import { zhCN } from '@/locales/zh-CN'

describe('比价模块注册', () => {
  it('注册为独立分组, 菜单位于基础数据之后', () => {
    expect(menuGroupOrder.indexOf('market')).toBe(
      menuGroupOrder.indexOf('master') + 1,
    )
    expect(menuGroupDefinitions.market.key).toBe('market')
    expect(zhCN.navigation.market).toBe('比价')
  })

  it('报单比价页面挂在比价分组, 路由为 /price-compare', () => {
    const page = appPageDefinitions.find(
      (entry) => entry.key === 'price-compare',
    )
    expect(page).toBeDefined()
    expect(page?.menuParent).toBe('market')
    expect(page?.view).toBe('price-compare')
    expect(getPageRoutePath(page!.key)).toBe('price-compare')
  })

  it('布局菜单中比价分组紧跟基础数据分组', () => {
    const entries = buildVisibleLayoutMenuEntries({
      appPageDefinitions,
      getMenuEntriesByGroup: (groupKey) =>
        buildMenuEntriesByGroup(appPageDefinitions).get(groupKey) ?? [],
      menuGroupDefinitions,
      menuGroupOrder,
    })
    const groups = entries.filter((entry) => entry.children.length > 0)
    const masterIndex = groups.findIndex((entry) => entry.menuCode === 'master')
    const marketIndex = groups.findIndex((entry) => entry.menuCode === 'market')
    expect(marketIndex).toBe(masterIndex + 1)
    expect(groups[marketIndex].children.map((child) => child.path)).toContain(
      '/price-compare',
    )
  })
})
