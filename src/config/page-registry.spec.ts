import { describe, expect, it } from 'vitest'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import { appPageDefinitions, getPageRoutePath } from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries } from '@/layouts/layout-menu'
import { enUS } from '@/locales/en-US'
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

/**
 * 标题改为 i18n key 后, key 写错不会在编译期暴露, 只会在界面上退化为 key 原文。
 * 因此逐条校验中英文资源都存在对应 key。
 */
describe('页面/分组标题 i18n key 完整性', () => {
  const resources: Record<string, unknown> = { 'zh-CN': zhCN, 'en-US': enUS }

  function readByPath(root: unknown, key: string): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[segment]
      }
      return undefined
    }, root)
  }

  it('每个页面定义都有 titleKey, 且中英文资源可解析', () => {
    const pages = appPageDefinitions.filter((entry) => !entry.hiddenInMenu)
    expect(pages.length).toBeGreaterThan(0)
    pages.forEach((entry) => {
      expect(entry.titleKey).toMatch(/^pages\.[a-z0-9-]+$/)
      Object.entries(resources).forEach(([locale, resource]) => {
        expect(
          readByPath(resource, entry.titleKey),
          `${locale} 缺少页面标题 ${entry.titleKey} (页面 ${entry.key})`,
        ).toBeTruthy()
      })
    })
  })

  it('每个菜单分组都有 titleKey, 且中英文资源可解析', () => {
    menuGroupOrder.forEach((groupKey) => {
      const group = menuGroupDefinitions[groupKey]
      expect(group.titleKey).toBe(`navigation.${groupKey}`)
      Object.entries(resources).forEach(([locale, resource]) => {
        expect(
          readByPath(resource, group.titleKey),
          `${locale} 缺少分组标题 ${group.titleKey}`,
        ).toBeTruthy()
      })
    })
  })

  it('标题 key 不允许是已翻译文案(防止回退成模块顶层 t())', () => {
    appPageDefinitions.forEach((entry) => {
      expect(entry.titleKey).not.toMatch(/[\u4e00-\u9fa5]/)
    })
  })
})
