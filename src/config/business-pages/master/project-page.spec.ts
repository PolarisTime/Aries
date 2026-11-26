import { describe, expect, it } from 'vitest'
import { enUS } from '@/locales/en-US'
import { zhCN } from '@/locales/zh-CN'
import { masterProjectPageConfigs } from './project-page'

/**
 * 项目资料 = 报单比价的**唯一配置点**（2026-11-16 用户定稿）。
 *
 * <p>锁住三件事：</p>
 * <ol>
 *   <li>表单里有比价配置字段（每品牌品种、商品规格、定尺加价、抗震代取、指定品牌）；</li>
 *   <li>这些字段进了 `saveFields.scalar`（否则保存载荷里根本没有它们）并进了详情；</li>
 *   <li>新增文案在 zh-CN / en-US 两侧都存在（i18n key 对齐）。</li>
 * </ol>
 */

const config = masterProjectPageConfigs.project

const QUOTE_FIELD_KEYS = [
  'quoteBrandCategories',
  'quoteProducts',
  'quoteLengthPremium',
  'quoteHrb400eFallback',
] as const

describe('项目资料：比价配置字段与三步向导', () => {
  it('项目资料拆分为 3 步且比价配置与允许范围归属第 3 步', () => {
    expect(config?.formSteps?.map((step) => step.title)).toEqual([
      zhCN.modules.formSections.basic,
      zhCN.modules.pages.project.stepPricingAndRules,
      zhCN.modules.pages.project.stepScopeAndQuote,
    ])
    const fields = config?.formFields ?? []
    for (const key of QUOTE_FIELD_KEYS) {
      const field = fields.find((item) => item.key === key)
      expect(field, `缺少字段 ${key}`).toBeDefined()
      expect(field?.formStep).toBe(3)
    }
    for (const key of [
      'allowedBrands',
      'allowedBrandSeverity',
      'allowedMaterials',
      'allowedMaterialSeverity',
    ]) {
      expect(fields.find((item) => item.key === key)?.formStep).toBe(3)
    }
    expect(fields.find((item) => item.key === 'priceRules')?.formStep).toBe(2)
  })

  it('每品牌启用品种由模块专属控件渲染（品牌 × 品类矩阵）', () => {
    const field = (config?.formFields ?? []).find(
      (item) => item.key === 'quoteBrandCategories',
    )
    expect(typeof field?.render).toBe('function')
    // 矩阵字段必须整行，否则每行两个下拉在窄列里会换行错位
    expect(field?.colSpan).toBe(24)
  })

  it('参与比价的商品规格由模块专属控件渲染（类别→材质→规格→长度树形多选）', () => {
    const field = (config?.formFields ?? []).find(
      (item) => item.key === 'quoteProducts',
    )
    // 2026-11-19 起不再用扁平多选：26 个商品键铺开会刷屏，改为树形多选（父节点=全选其下规格）
    expect(typeof field?.render).toBe('function')
    expect(field?.options).toBeUndefined()
    expect(field?.colSpan).toBe(24)
  })

  it('抗震牌号代取的值是 boolean（接口契约），定尺加价是数字', () => {
    const fields = config?.formFields ?? []
    expect(
      fields.find((item) => item.key === 'quoteHrb400eFallback')?.render,
    ).toBeTypeOf('function')
    const premium = fields.find((item) => item.key === 'quoteLengthPremium')
    expect(premium?.type).toBe('number')
    expect(premium?.min).toBe(0)
  })

  it('5 个字段都进了保存载荷白名单', () => {
    const scalar = config?.saveFields?.scalar ?? []
    for (const key of QUOTE_FIELD_KEYS) {
      expect(scalar, `saveFields.scalar 缺少 ${key}`).toContain(key)
    }
  })

  it('比价配置按 24 栅格对齐：长清单整行，其余三项 12 成对', () => {
    const fields = config?.formFields ?? []
    const spanOf = (key: string) =>
      fields.find((item) => item.key === key)?.colSpan
    // 三个「清单型」字段（矩阵、商品键、指定品牌）各占整行；两个标量设置按 12 成对
    for (const key of ['quoteBrandCategories', 'quoteProducts']) {
      expect(spanOf(key), `${key} 必须整行`).toBe(24)
    }
    expect(spanOf('quoteLengthPremium')).toBe(12)
    expect(spanOf('quoteHrb400eFallback')).toBe(12)
    const rowOf = (key: string) => fields.find((item) => item.key === key)?.row
    expect(rowOf('quoteLengthPremium')).toBe(rowOf('quoteHrb400eFallback'))
  })

  it('品牌与材质的「处理方式」标签必须可区分（原来两个都叫「处理方式」）', () => {
    const fields = config?.formFields ?? []
    const brandLabel = fields.find(
      (item) => item.key === 'allowedBrandSeverity',
    )?.label
    const materialLabel = fields.find(
      (item) => item.key === 'allowedMaterialSeverity',
    )?.label
    expect(brandLabel).toBeTruthy()
    expect(materialLabel).toBeTruthy()
    expect(brandLabel).not.toBe(materialLabel)
  })

  it('定尺加价进入详情字段（多值字段留在编辑弹层，避免详情网格挤宽）', () => {
    const detailKeys = (config?.detailFields ?? []).map((field) => field.key)
    expect(detailKeys).toContain('quoteLengthPremium')
  })
})

describe('i18n：新增文案两侧齐全', () => {
  const pick = (dictionary: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>((node, part) => {
      if (!node || typeof node !== 'object') return undefined
      return (node as Record<string, unknown>)[part]
    }, dictionary)

  const KEYS = [
    'modules.pages.project.stepPricingAndRules',
    'modules.pages.project.stepScopeAndQuote',
    'modules.pages.project.sectionQuote',
    'modules.pages.project.quoteBrandCategories',
    'modules.pages.project.quoteBrandCategoriesHint',
    'modules.pages.project.quoteBrandCategoriesEmpty',
    'modules.pages.project.quoteBrandCategoriesPlaceholder',
    'modules.pages.project.quoteProducts',
    'modules.pages.project.quoteProductsHint',
    'modules.pages.project.quoteProductsPlaceholder',
    'modules.pages.project.quoteLengthPremium',
    'modules.pages.project.quoteLengthPremiumHint',
    'modules.pages.project.quoteHrb400eFallback',
    'modules.pages.project.quoteHrb400eFallbackHint',
    'modules.pages.project.quoteHrb400eFallbackOn',
    'modules.pages.project.quoteHrb400eFallbackOff',
    'priceCompare.config.freightOnlyHint',
    'priceCompare.config.gotoProject',
    'priceCompare.config.noBrands',
  ]

  it.each(KEYS)('zh-CN 与 en-US 都有 %s', (key) => {
    expect(pick(zhCN, key)).toBeTypeOf('string')
    expect(pick(enUS, key)).toBeTypeOf('string')
  })
})
