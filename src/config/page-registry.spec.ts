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

const i18nResources: Record<string, unknown> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

/** 按 `pages.xxx` 路径读取 i18n 资源；key 写错时返回 undefined。 */
function readI18nKey(root: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[segment]
    }
    return undefined
  }, root)
}

function menuKeysOfGroup(groupKey: 'master' | 'system'): string[] {
  return (buildMenuEntriesByGroup(appPageDefinitions).get(groupKey) ?? []).map(
    (entry) => entry.menuKey,
  )
}

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

  it('供应商报价表挂在比价分组，紧随报单比价之后，且不再出现在基础数据', () => {
    const marketMenuKeys = (
      buildMenuEntriesByGroup(appPageDefinitions).get('market') ?? []
    ).map((entry) => entry.menuKey)
    expect(marketMenuKeys).toEqual([
      '/price-compare',
      '/supplier-quote',
      '/market-sync',
    ])

    const masterMenuKeys = (
      buildMenuEntriesByGroup(appPageDefinitions).get('master') ?? []
    ).map((entry) => entry.menuKey)
    expect(masterMenuKeys).not.toContain('/supplier-quote')

    const page = appPageDefinitions.find(
      (entry) => entry.key === 'supplier-quote',
    )
    expect(page?.view).toBe('supplier-quote')
    expect(page?.requiredPermission).toBe('supplier-price-lists:read')
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
  const resources = i18nResources

  it('每个页面定义都有 titleKey, 且中英文资源可解析', () => {
    const pages = appPageDefinitions.filter((entry) => !entry.hiddenInMenu)
    expect(pages.length).toBeGreaterThan(0)
    pages.forEach((entry) => {
      expect(entry.titleKey).toMatch(/^pages\.[a-z0-9-]+$/)
      Object.entries(resources).forEach(([locale, resource]) => {
        expect(
          readI18nKey(resource, entry.titleKey),
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
          readI18nKey(resource, group.titleKey),
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

/**
 * 「基础数据」子页面合并方案（已与用户确认）：
 * 商品资料吸收 材料类别 / 定尺加价 / 值映射，项目资料吸收 报价地区，
 * 公司设置挪到系统设置分组；菜单 11 → 6，被并页保留页面定义与深链路由。
 */
describe('基础数据子页面合并', () => {
  const mergedPages = [
    {
      key: 'material-categories',
      view: 'master-material',
      activeMenuKey: '/material',
    },
    {
      key: 'length-premium',
      view: 'master-material',
      activeMenuKey: '/material',
    },
    { key: 'value-alias', view: 'master-material', activeMenuKey: '/material' },
    { key: 'quote-region', view: 'master-project', activeMenuKey: '/project' },
  ] as const

  it('基础数据菜单只保留 6 个宿主页（顺序稳定）', () => {
    expect(menuKeysOfGroup('master')).toEqual([
      '/material',
      '/supplier',
      '/customer',
      '/project',
      '/carrier',
      '/warehouse',
    ])
  })

  it('被并页不进菜单，但保留页面定义、路由与菜单高亮宿主项', () => {
    const hiddenMasterKeys = appPageDefinitions
      .filter((entry) => entry.menuParent === 'master' && entry.hiddenInMenu)
      .map((entry) => entry.key)
    expect(hiddenMasterKeys.toSorted()).toEqual(
      mergedPages.map((item) => item.key).toSorted(),
    )

    mergedPages.forEach((item) => {
      const page = appPageDefinitions.find((entry) => entry.key === item.key)
      expect(page, `页面定义必须保留: ${item.key}`).toBeDefined()
      expect(page?.hiddenInMenu).toBe(true)
      expect(page?.activeMenuKey).toBe(item.activeMenuKey)
      expect(page?.view).toBe(item.view)
      // 深链不能 404：路由仍按 menuKey 生成
      expect(getPageRoutePath(item.key)).toBe(item.key)
    })
  })

  it('两个宿主页登记宿主视图并接受 ?tab= 查询串（深链意图参数不被丢弃）', () => {
    const hosts = [
      { key: 'material', view: 'master-material' },
      { key: 'project', view: 'master-project' },
    ] as const
    hosts.forEach((host) => {
      const page = appPageDefinitions.find((entry) => entry.key === host.key)
      expect(page?.view).toBe(host.view)
      expect(page?.hiddenInMenu).toBeUndefined()
      expect(typeof page?.validateSearch).toBe('function')
      expect(
        page?.validateSearch?.({ tab: 'value-alias', docNo: 'PO-2026-0001' }),
      ).toEqual({ tab: 'value-alias', docNo: 'PO-2026-0001' })
    })
  })

  it('被并页标题 key 在中英文资源里都可解析（shell 标签标题会用到）', () => {
    mergedPages.forEach((item) => {
      const page = appPageDefinitions.find((entry) => entry.key === item.key)
      expect(page).toBeDefined()
      Object.entries(i18nResources).forEach(([locale, resource]) => {
        expect(
          readI18nKey(resource, page!.titleKey),
          `${locale} 缺少页面标题 ${page!.titleKey} (页面 ${page!.key})`,
        ).toBeTruthy()
      })
    })
  })

  it('公司设置挪进系统设置分组，且不再出现在基础数据', () => {
    const companySetting = appPageDefinitions.find(
      (entry) => entry.key === 'company-setting',
    )
    expect(companySetting?.menuParent).toBe('system')
    expect(companySetting?.hiddenInMenu).toBeUndefined()
    expect(menuKeysOfGroup('master')).not.toContain('/company-setting')
    expect(menuKeysOfGroup('system')).toContain('/company-setting')
  })
})
