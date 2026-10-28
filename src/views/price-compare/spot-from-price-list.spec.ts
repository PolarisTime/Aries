import { describe, expect, it } from 'vitest'
import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import {
  isSubstitutableMaterial,
  resolveSpotSourceMaterial,
  SUBSTITUTABLE_MATERIALS,
} from './core'
import { applyLowestQuotes } from './spot-from-price-list'
import { clearSpotSourceIn, resolveCellSpotSource } from './spot-source-cancel'
import type { PriceRow, PriceSheet } from './types'

/**
 * 「从价格表带价」的取价规则。
 *
 * <p>核心是三条：只填空格子（不覆盖手工价）、按 (品牌, 商品) 精确匹配、连供应商一起带。
 * 这里用能区分新旧行为的数据钉住它们 —— 若哪天改成"覆盖已有价"，第一条会立刻变红。</p>
 */

const row = (id: string, material: string, spec: number): PriceRow => ({
  id,
  rowType: 'PRODUCT',
  category: '直条',
  material,
  spec,
  length: '9米',
})

const sheet = (overrides: Partial<PriceSheet> = {}): PriceSheet => ({
  id: 's1',
  name: '批次 1',
  status: '报价',
  projectId: 'p1',
  projectName: '云潮筝鸣府',
  orderDate: '2026-10-22',
  refDate: '2026-10-22',
  refPeriod: '上午',
  lengthPremium: 0,
  inputs: {},
  rows: [row('a', 'HRB400E', 12)],
  brands: [
    { name: '中天', freight: 0 },
    { name: '中杭', freight: 0 },
  ],
  ...overrides,
})

const quote = (
  brandName: string,
  spec: number,
  price: number,
  overrides: Partial<BrandLowestQuote> = {},
): BrandLowestQuote => ({
  brandName,
  category: '直条',
  material: 'HRB400E',
  spec,
  length: '9米',
  price,
  priceListId: '900',
  supplierId: '77',
  supplierName: '物产中大',
  ...overrides,
})

describe('applyLowestQuotes', () => {
  it('空着的格子按品牌带出最低价, 并连供应商一起带', () => {
    const result = applyLowestQuotes(sheet(), [quote('中天', 12, 3420)])
    expect(result.filled).toBe(1)
    expect(result.inputs['中天:a']).toEqual({
      spot: 3420,
      supplierId: '77',
      supplierName: '物产中大',
    })
  })

  /**
   * 与「供应商报价表」的联动口径。
   *
   * <p>供应商报价表把「规格行 × 品牌」的价格存成 `类别|材质|规格|定尺`，报单比价这边用
   * {@link productKeyOf} 生成同一个键；盘螺这类没有定尺的规格，两侧入库值都是 `'-'`
   * （实测 `mk_supplier_price_item` 与 `mk_quote_item` 的盘螺行 length 均为 `'-'`）。
   * 这里把该约定钉住：`'-'` 必须命中、`''` 不能命中 —— 否则改一行归一化就会让整类商品静默取不到价。</p>
   */
  /**
   * 类别别名：商品资料用「直条」、报单比价行用「螺纹钢」，两者是同一类别。
   *
   * <p>供应商价格表按商品资料存成 `直条`，报单比价的行是 `螺纹钢`；若键里直接拼原始类别，
   * 螺纹钢这一类永远取不到价（实测：盘螺能带、螺纹钢一条都带不上）。
   * 键生成统一走 {@link productKeyOf}，它按 {@link canonicalCategory} 归一，两端口径自然一致。</p>
   */
  it('直条/螺纹钢是同一类别：价格表按直条存也能填到螺纹钢行', () => {
    const threadRow: PriceRow = {
      ...row('t', 'HRB400E', 12),
      category: '螺纹钢',
    }
    const threadSheet = sheet({
      rows: [threadRow],
      brands: [{ name: '中天', freight: 0 }],
    })
    const result = applyLowestQuotes(threadSheet, [
      quote('中天', 12, 3420, {
        category: '直条',
        material: 'HRB400E',
        length: '9米',
      }),
    ])
    expect(result.filled).toBe(1)
    expect(result.inputs['中天:t']?.spot).toBe(3420)
  })

  it('无定尺商品（盘螺）按入库值 - 匹配：- 命中、空串不命中', () => {
    const panluoRow: PriceRow = {
      ...row('p', 'HRB400', 8),
      category: '盘螺',
      length: '-',
    }
    const panluoSheet = sheet({
      rows: [panluoRow],
      brands: [{ name: '中天', freight: 0 }],
    })

    const hit = applyLowestQuotes(panluoSheet, [
      quote('中天', 8, 3980, {
        category: '盘螺',
        material: 'HRB400',
        length: '-',
      }),
    ])
    expect(hit.filled).toBe(1)
    expect(hit.inputs['中天:p']?.spot).toBe(3980)

    const miss = applyLowestQuotes(panluoSheet, [
      quote('中天', 8, 3980, {
        category: '盘螺',
        material: 'HRB400',
        length: '',
      }),
    ])
    expect(miss.filled).toBe(0)
  })

  it('已有现货价的格子一律不动(不覆盖手工判定的价)', () => {
    const result = applyLowestQuotes(
      sheet({ inputs: { '中天:a': { spot: 3400 } } }),
      [quote('中天', 12, 3420)],
    )
    expect(result.filled).toBe(0)
    expect(result.inputs['中天:a']?.spot).toBe(3400)
  })

  it('品牌不匹配的报价不会被填到别的品牌列', () => {
    const result = applyLowestQuotes(sheet(), [quote('杭钢', 12, 3420)])
    expect(result.filled).toBe(0)
  })

  it('同一格出现多条报价时取更低者, 与入参顺序无关', () => {
    const result = applyLowestQuotes(sheet(), [
      quote('中天', 12, 3450),
      quote('中天', 12, 3400),
    ])
    expect(result.inputs['中天:a']?.spot).toBe(3400)
  })

  it('规格不匹配时不填(商品键含类别/材质/规格/定尺)', () => {
    const result = applyLowestQuotes(sheet(), [quote('中天', 14, 3420)])
    expect(result.filled).toBe(0)
  })

  it('没有报价时原样返回, 调用方据 filled===0 跳过保存', () => {
    const source = sheet()
    const result = applyLowestQuotes(source, [])
    expect(result.filled).toBe(0)
    expect(result.inputs).toBe(source.inputs)
  })
})

/**
 * 抗震牌号代取（二级匹配）。
 *
 * <p>用「行材质 HRB400 / 报价只有 HRB400E」的数据锁定：精确材质取不到时才代取，
 * 代取必须留下来源材质，开关关闭时代取必须完全不发生。三者的数据形态互不相同，
 * 任何一条被改成"总是代取"或"代取不留来源"都会立刻变红。</p>
 */
describe('applyLowestQuotes 抗震牌号代取', () => {
  const hrb400Sheet = (overrides: Partial<PriceSheet> = {}): PriceSheet =>
    sheet({ rows: [row('a', 'HRB400', 12)], ...overrides })

  it('开关关闭时不做代取: 只有 HRB400E 报价不会填进 HRB400 行', () => {
    const result = applyLowestQuotes(hrb400Sheet(), [quote('中天', 12, 3420)])
    expect(result.filled).toBe(0)
    expect(result.substituted).toBe(0)
  })

  it('开关打开时代取生效, 并记录下来源材质', () => {
    const result = applyLowestQuotes(hrb400Sheet(), [quote('中天', 12, 3420)], {
      allowHrb400eFallback: true,
    })
    expect(result.filled).toBe(1)
    expect(result.substituted).toBe(1)
    const cell = result.inputs['中天:a']
    expect(cell.spot).toBe(3420)
    // 落库字段: 重新打开单据后角标要据此显示
    expect(cell.spotSourceMaterial).toBe('HRB400E')
    // 供应商仍随价一起带
    expect(cell.supplierName).toBe('物产中大')
  })

  it('精确材质优先于代取, 且精确命中不留来源标记', () => {
    const result = applyLowestQuotes(
      hrb400Sheet(),
      [
        quote('中天', 12, 3400, { material: 'HRB400' }),
        quote('中天', 12, 3300),
      ],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(1)
    expect(result.substituted).toBe(0)
    expect(result.inputs['中天:a'].spot).toBe(3400)
    expect(result.inputs['中天:a'].spotSourceMaterial).toBeUndefined()
  })

  it('代取同样只填空格子, 不覆盖已有现货价', () => {
    const result = applyLowestQuotes(
      hrb400Sheet({ inputs: { '中天:a': { spot: 3399 } } }),
      [quote('中天', 12, 3420)],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(0)
    expect(result.inputs['中天:a'].spot).toBe(3399)
  })

  it('已是抗震牌号的行不会被反向代取', () => {
    // 行材质 HRB400E, 报价只有 HRB400: substituteMaterialOf 对已带 E 的牌号返回 null
    const result = applyLowestQuotes(
      sheet({
        rows: [row('a', 'HRB400E', 12)],
      }),
      [quote('中天', 12, 3400, { material: 'HRB400' })],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(0)
  })

  it('非 HRB 系列材质不参与代取(盘螺 HPB300)', () => {
    const result = applyLowestQuotes(
      sheet({ rows: [row('a', 'HPB300', 8)] }),
      [quote('中天', 8, 3500, { material: 'HPB300E' })],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(0)
  })

  // 下面三条钉住「白名单收敛」：扩容必须经产品确认，不能顺手加
  it('白名单只有 HRB400: HRB500 当前不代取', () => {
    const result = applyLowestQuotes(
      sheet({ rows: [row('a', 'HRB500', 12)] }),
      [quote('中天', 12, 3600, { material: 'HRB500E' })],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(0)
  })

  it('白名单只有 HRB400: HRB335 当前不代取(避免生成不存在的 HRB335E)', () => {
    const result = applyLowestQuotes(
      sheet({ rows: [row('a', 'HRB335', 12)] }),
      [quote('中天', 12, 3300, { material: 'HRB335E' })],
      { allowHrb400eFallback: true },
    )
    expect(result.filled).toBe(0)
  })

  it('白名单本身钉住: 当前只允许 HRB400, 且大小写/空白不放过', () => {
    expect(SUBSTITUTABLE_MATERIALS).toEqual(['HRB400'])
    expect(isSubstitutableMaterial('HRB400')).toBe(true)
    expect(isSubstitutableMaterial('HRB500')).toBe(false)
    expect(isSubstitutableMaterial('HRB335')).toBe(false)
    expect(isSubstitutableMaterial('hrb400')).toBe(false)
    expect(isSubstitutableMaterial(' HRB400 ')).toBe(false)
    expect(isSubstitutableMaterial(undefined)).toBe(false)
  })
})

/**
 * 角标判据：**两条来源都必须覆盖**（系统带出 / 手工勾选行）。
 *
 * <p>这里刻意把两个来源做成互斥的数据形态：系统带出「无行开关」、手工勾选「无 spotSourceMaterial」。
 * 只实现一条时，对应用例会立刻红 —— 这是"只覆盖一条等于没做"的机器化保证。</p>
 */
describe('resolveSpotSourceMaterial 角标判据', () => {
  const rowOf = (
    material: string,
    hrb400eFallback?: boolean,
  ): { material: string; hrb400eFallback?: boolean } => ({
    material,
    ...(hrb400eFallback === undefined ? {} : { hrb400eFallback }),
  })

  it('系统带出优先: 有 spotSourceMaterial 就返回它, 不依赖行开关', () => {
    expect(
      resolveSpotSourceMaterial({
        input: { spot: 3420, spotSourceMaterial: 'HRB400E' },
        row: rowOf('HRB400'),
        allowHrb400eFallback: false,
      }),
    ).toBe('HRB400E')
  })

  it('手工勾选行: 行开关打开 + 单据头放行 + 白名单材质 → 打标', () => {
    expect(
      resolveSpotSourceMaterial({
        input: { spot: 3420 },
        row: rowOf('HRB400', true),
        allowHrb400eFallback: true,
      }),
    ).toBe('HRB400E')
  })

  it('单据头未放行时手工勾选行不打标', () => {
    expect(
      resolveSpotSourceMaterial({
        input: { spot: 3420 },
        row: rowOf('HRB400', true),
        allowHrb400eFallback: false,
      }),
    ).toBeUndefined()
  })

  it('行开关未打开时不打标', () => {
    expect(
      resolveSpotSourceMaterial({
        input: { spot: 3420 },
        row: rowOf('HRB400'),
        allowHrb400eFallback: true,
      }),
    ).toBeUndefined()
  })

  it('非白名单材质(HRB500)即便勾了行开关也不打标', () => {
    expect(
      resolveSpotSourceMaterial({
        input: { spot: 3600 },
        row: rowOf('HRB500', true),
        allowHrb400eFallback: true,
      }),
    ).toBeUndefined()
  })

  it('空格子不打标(没有价就没有代取价)', () => {
    expect(
      resolveSpotSourceMaterial({
        input: undefined,
        row: rowOf('HRB400', true),
        allowHrb400eFallback: true,
      }),
    ).toBeUndefined()
  })

  it('显式 null 优先于行级开关: 取消后即使行开关打开也不打标', () => {
    // 这是"单格取消"能生效的关键：null 必须在行级判据之前短路
    expect(
      resolveCellSpotSource({
        input: { spot: 3420, spotSourceMaterial: null },
        row: rowOf('HRB400', true),
        allowHrb400eFallback: true,
      }),
    ).toBeUndefined()
  })

  it('缺字段与显式 null 语义不同: 缺字段仍按行级开关判定', () => {
    // 缺字段 = 没带信息，不能当成"确认没代取"，否则取消标记会被顺手抹掉
    expect(
      resolveCellSpotSource({
        input: { spot: 3420 },
        row: rowOf('HRB400', true),
        allowHrb400eFallback: true,
      }),
    ).toBe('HRB400E')
  })
})

/**
 * 单格取消代取的写入语义。
 *
 * <p>用它把四件事一次钉住：该格写入的是**显式 null（键必须存在）**、其它格不受影响、
 * 价格数值与供应商原样保留、格不存在时不产生空 patch。</p>
 */
describe('clearSpotSourceIn 单格取消代取', () => {
  const base = () => ({
    '中天:a': { spot: 3420, supplierId: '77', supplierName: '钧叶' },
    '中天:b': { spot: 3450, spotSourceMaterial: 'HRB400E' },
  })

  it('该格的 spotSourceMaterial 被置为显式 null, 且键存在', () => {
    const next = clearSpotSourceIn(base(), '中天', 'a')
    expect(next).not.toBeNull()
    const cell = next?.['中天:a']
    // 断言 key 存在(而不是 undefined): 显式 null 才能表达"查过、确认没代取"
    expect(cell && 'spotSourceMaterial' in cell).toBe(true)
    expect(cell?.spotSourceMaterial).toBeNull()
  })

  it('其它格完全不受影响', () => {
    const source = base()
    const next = clearSpotSourceIn(source, '中天', 'a')
    expect(next?.['中天:b']).toEqual(source['中天:b'])
  })

  it('价格数值与供应商原样保留(只改来源标记)', () => {
    const next = clearSpotSourceIn(base(), '中天', 'a')
    const cell = next?.['中天:a']
    expect(cell?.spot).toBe(3420)
    expect(cell?.supplierId).toBe('77')
    expect(cell?.supplierName).toBe('钧叶')
  })

  it('不修改入参(纯函数), 格不存在时返回 null 而不产生空对象', () => {
    const source = base()
    clearSpotSourceIn(source, '中天', 'a')
    expect('spotSourceMaterial' in source['中天:a']).toBe(false)
    expect(clearSpotSourceIn(source, '中天', 'nope')).toBeNull()
  })
})
