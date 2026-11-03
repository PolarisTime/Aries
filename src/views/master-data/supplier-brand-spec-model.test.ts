import { describe, expect, it } from 'vitest'
import type { SupplierPriceSpecRow } from '@/api/market/supplier-price-lists'
import type { SupplierBrandSpecItem } from '@/api/master/supplier-brand-specs'
import {
  applyBrandSpecSelection,
  brandSpecOptionsOf,
  compareSupplierBrandSpecs,
  configuredBrandSpecCount,
  defaultBrandSpecKeys,
  isFullBrandSpecSelection,
  selectedBrandSpecKeys,
  supplierBrandSpecLabelOf,
  supplierBrandSpecPayload,
} from './supplier-brand-spec-model'

const specRow = (overrides: Partial<SupplierPriceSpecRow> = {}) => ({
  brand: '萍钢',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ...overrides,
})

const item = (overrides: Partial<SupplierBrandSpecItem> = {}) => ({
  brandName: '萍钢',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ...overrides,
})

/** 萍钢：直条 HRB400E 12/14 × 9米，盘螺 HRB400 8 × -（3 个组合）。 */
const ROWS: SupplierPriceSpecRow[] = [
  specRow({ spec: 14 }),
  specRow({ spec: 12 }),
  specRow({ category: '盘螺', material: 'HRB400', spec: 8, length: '-' }),
  // 其它品牌不参与该品牌的穿梭框
  specRow({ brand: '中天', spec: 16 }),
  // 重复记录（商品资料同一组合被录两次）
  specRow(),
]

describe('穿梭框数据源：商品资料按品牌切分', () => {
  it('只取该品牌的组合，去重并按 类别/规格 排序', () => {
    const options = brandSpecOptionsOf(ROWS, '萍钢')

    expect(options.map(supplierBrandSpecLabelOf)).toEqual([
      '盘螺 · HRB400 · 8 · -',
      '直条 · HRB400E · 12 · 9米',
      '直条 · HRB400E · 14 · 9米',
    ])
  })

  it('品牌名前后空白不影响匹配，空品牌不返回任何组合', () => {
    expect(brandSpecOptionsOf(ROWS, ' 萍钢 ')).toHaveLength(3)
    expect(brandSpecOptionsOf(ROWS, '   ')).toEqual([])
  })

  it('缺类别/材质/定尺的商品记录不进穿梭框（无法落成合法配置）', () => {
    const options = brandSpecOptionsOf(
      [
        specRow({ category: '' }),
        specRow({ material: ' ' }),
        specRow({ length: '' }),
        specRow(),
      ],
      '萍钢',
    )

    expect(options).toHaveLength(1)
  })
})

describe('条目展示与排序', () => {
  it('展示为「类别 · 材质 · 规格 · 定尺」', () => {
    expect(supplierBrandSpecLabelOf(item())).toBe('直条 · HRB400E · 12 · 9米')
  })

  it('排序先按品牌，再按类别/材质/规格/定尺', () => {
    // 品牌名用 ASCII：中文的 localeCompare 顺序依赖 ICU collation，不适合作为断言基准
    const sorted = [
      item({ brandName: 'BrandB', spec: 8 }),
      item({ brandName: 'BrandA', spec: 14 }),
      item({ brandName: 'BrandA', spec: 12 }),
    ].sort(compareSupplierBrandSpecs)

    expect(sorted.map((entry) => `${entry.brandName}${entry.spec}`)).toEqual([
      'BrandA12',
      'BrandA14',
      'BrandB8',
    ])
  })
})

describe('默认全量 vs 显式配置', () => {
  const options = brandSpecOptionsOf(ROWS, '萍钢')

  it('没有条目时视为默认全选', () => {
    expect(selectedBrandSpecKeys(undefined, '萍钢', options)).toEqual(
      defaultBrandSpecKeys(options),
    )
    expect(selectedBrandSpecKeys([], '萍钢', options)).toHaveLength(3)
  })

  it('显式配置只回显配置里的键', () => {
    const draft = [item({ spec: 12 }), item({ spec: 14 })]

    expect(selectedBrandSpecKeys(draft, '萍钢', options)).toEqual([
      '萍钢|直条|HRB400E|12|9米',
      '萍钢|直条|HRB400E|14|9米',
    ])
  })

  it('商品资料里已不存在的旧配置不回显（穿梭框里无从勾选）', () => {
    const draft = [item({ spec: 99 })]

    expect(selectedBrandSpecKeys(draft, '萍钢', options)).toEqual([])
  })

  it('已配置数按品牌统计，未配置返回 null', () => {
    const draft = [item({ spec: 12 }), item({ brandName: '中天', spec: 16 })]

    expect(configuredBrandSpecCount(draft, '萍钢')).toBe(1)
    expect(configuredBrandSpecCount(draft, '中天')).toBe(1)
    expect(configuredBrandSpecCount(draft, '永钢')).toBeNull()
    expect(configuredBrandSpecCount(undefined, '萍钢')).toBeNull()
  })
})

describe('确认选择结果：全选归一为未配置', () => {
  const options = brandSpecOptionsOf(ROWS, '萍钢')
  const fullKeys = defaultBrandSpecKeys(options)

  it('取消勾选一项 → 写成显式配置（真子集）', () => {
    const next = applyBrandSpecSelection(undefined, '萍钢', options, [
      fullKeys[0],
      fullKeys[1],
    ])

    // 2/3 ≠ 全选：必须写成显式配置，否则报价表会按全量收敛（配置了却不生效）
    expect(next.map(supplierBrandSpecLabelOf)).toEqual([
      '盘螺 · HRB400 · 8 · -',
      '直条 · HRB400E · 12 · 9米',
    ])
    expect(next).toHaveLength(2)
  })

  it('isFullBrandSpecSelection 用能区分两种口径的数据判定', () => {
    expect(isFullBrandSpecSelection(options, fullKeys)).toBe(true)
    expect(isFullBrandSpecSelection(options, fullKeys.slice(0, 2))).toBe(false)
    // 多出来的未知键不影响"已勾满"的判定
    expect(isFullBrandSpecSelection(options, [...fullKeys, 'x|y|z|1|2'])).toBe(
      true,
    )
    // 没有可选组合时不算全选（否则会被当成"未配置"而丢掉显式意图）
    expect(isFullBrandSpecSelection([], [])).toBe(false)
  })

  it('勾满全部 → 不写条目（等价于默认全量，避免灌一份会过期的快照）', () => {
    expect(
      applyBrandSpecSelection(undefined, '萍钢', options, fullKeys),
    ).toEqual([])
  })

  it('从显式配置勾回全部 → 条目被清掉，回到默认全量', () => {
    const draft = [item({ spec: 12 })]

    expect(applyBrandSpecSelection(draft, '萍钢', options, fullKeys)).toEqual(
      [],
    )
  })

  it('空选择无法表达「一个都不报」：按未配置处理，不写空配置', () => {
    expect(applyBrandSpecSelection(undefined, '萍钢', options, [])).toEqual([])
  })

  it('只替换当前品牌的条目，其它品牌原样保留', () => {
    const draft = [item({ brandName: '中天', spec: 16 }), item({ spec: 12 })]

    const next = applyBrandSpecSelection(draft, '萍钢', options, [fullKeys[0]])

    expect(next).toHaveLength(2)
    expect(next.filter((entry) => entry.brandName === '中天')).toEqual([
      item({ brandName: '中天', spec: 16 }),
    ])
    expect(next.find((entry) => entry.brandName === '萍钢')).toEqual(
      item({ category: '盘螺', material: 'HRB400', spec: 8, length: '-' }),
    )
  })

  it('不修改入参', () => {
    const draft = [item({ spec: 12 })]
    const snapshot = JSON.parse(JSON.stringify(draft))

    applyBrandSpecSelection(draft, '萍钢', options, [fullKeys[0]])

    expect(draft).toEqual(snapshot)
  })

  it('未知键被忽略（防伪造/串品牌）', () => {
    const next = applyBrandSpecSelection(undefined, '萍钢', options, [
      '中天|直条|HRB400E|16|9米',
    ])

    expect(next).toEqual([])
  })
})

describe('保存载荷只保留当前经营品牌', () => {
  it('过滤越界品牌、去重并稳定排序', () => {
    const payload = supplierBrandSpecPayload(
      [
        item({ brandName: '永钢', spec: 16 }),
        item({ spec: 14 }),
        item({ spec: 12 }),
        item({ spec: 12, material: ' HRB400E ' }),
      ],
      ['萍钢', '中天'],
    )

    expect(payload.map((entry) => entry.spec)).toEqual([12, 14])
    expect(payload.every((entry) => entry.brandName === '萍钢')).toBe(true)
  })

  it('草稿未知（undefined）时载荷为空，不会拿空配置覆盖服务端', () => {
    expect(supplierBrandSpecPayload(undefined, ['萍钢'])).toEqual([])
  })

  it('经营品牌为空时载荷为空', () => {
    expect(supplierBrandSpecPayload([item()], [])).toEqual([])
    expect(supplierBrandSpecPayload([item()], ['  '])).toEqual([])
  })
})
