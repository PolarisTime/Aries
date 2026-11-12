import { describe, expect, it } from 'vitest'
import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import { isSubstitutableMaterial, SUBSTITUTABLE_MATERIALS } from './core'
import { importLowestQuotes } from './spot-from-price-list'
import type { PriceRow, PriceSheet } from './types'

/**
 * 「从供应商价格表导入」的取价规则。
 *
 * <p>业务定稿：报单比价页**默认禁止手动改价，无例外** —— 现货价与供应商的唯一来源就是
 * 供应商价格表。因此这里的核心规则与旧的「从价格表带价」相反：</p>
 * <ol>
 *   <li><b>覆盖式</b>：已有价一律按价格表刷新（不是只填空格子）；</li>
 *   <li><b>未匹配即清空</b>：价格表里没有的格子整条删掉（价 + 供应商 + 代取来源）；</li>
 *   <li><b>按 (品牌, 商品) 精确匹配</b>，类别别名（直条 → 螺纹钢）由 productKeyOf 归一；</li>
 *   <li>抗震牌号代取仅在单据头放行时生效，且精确命中必须清掉旧来源标记。</li>
 * </ol>
 *
 * <p>用能区分新旧行为的数据钉住它们：若哪天退回「只填空格」，覆盖用料例会立刻变红；
 * 若忘了清空，未匹配用例会变红。</p>
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

describe('importLowestQuotes 覆盖式导入', () => {
  it('空格子带出最低价, 并连供应商一起带', () => {
    const { inputs, stats } = importLowestQuotes(sheet(), [
      quote('中天', 12, 3420),
    ])
    expect(stats.added).toBe(1)
    expect(stats.updated).toBe(0)
    expect(inputs['中天:a']).toEqual({
      spot: 3420,
      supplierId: '77',
      supplierName: '物产中大',
    })
    // 该品牌没有报价的另一列被清空（本来也不存在）
    expect(inputs['中杭:a']).toBeUndefined()
  })

  it('已有现货价被覆盖(不是"只填空格")', () => {
    const { inputs, stats } = importLowestQuotes(
      sheet({ inputs: { '中天:a': { spot: 3400 } } }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.updated).toBe(1)
    expect(stats.added).toBe(0)
    expect(stats.priceUp).toBe(1)
    expect(stats.priceDown).toBe(0)
    expect(inputs['中天:a'].spot).toBe(3420)
  })

  it('价格下调同样算改价(priceDown)', () => {
    const { inputs, stats } = importLowestQuotes(
      sheet({ inputs: { '中天:a': { spot: 3500 } } }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.priceDown).toBe(1)
    expect(stats.priceUp).toBe(0)
    expect(inputs['中天:a'].spot).toBe(3420)
  })

  it('未匹配的格子整格清空: 价 + 供应商 + 代取来源一起消失', () => {
    const { inputs, stats } = importLowestQuotes(
      sheet({
        inputs: {
          '中天:a': {
            spot: 3400,
            supplierId: '9',
            supplierName: '老供应商',
            spotSourceMaterial: 'HRB400E',
          },
        },
      }),
      [],
    )
    expect(stats.cleared).toBe(1)
    expect(inputs['中天:a']).toBeUndefined()
  })

  it('供应商列未匹配时也清掉(不因只有供应商而保留)', () => {
    const { inputs } = importLowestQuotes(
      sheet({
        inputs: { '中天:a': { supplierId: '9', supplierName: '老供应商' } },
      }),
      [],
    )
    expect(inputs['中天:a']).toBeUndefined()
  })

  it('已有价且价相同时计入 unchanged(供应商照样按价格表刷新)', () => {
    const { inputs, stats } = importLowestQuotes(
      sheet({
        inputs: {
          '中天:a': { spot: 3420, supplierId: 'old', supplierName: '旧名' },
        },
      }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.unchanged).toBe(1)
    expect(stats.added).toBe(0)
    expect(stats.updated).toBe(0)
    expect(inputs['中天:a'].supplierId).toBe('77')
    expect(inputs['中天:a'].supplierName).toBe('物产中大')
  })

  it('之前无价、现在仍无价不计入 unchanged', () => {
    const { stats } = importLowestQuotes(sheet(), [])
    expect(stats.unchanged).toBe(0)
    expect(stats.added).toBe(0)
    expect(stats.updated).toBe(0)
    expect(stats.cleared).toBe(0)
  })
})

describe('importLowestQuotes 匹配口径', () => {
  /**
   * 类别别名：商品资料用「直条」、报单比价行用「螺纹钢」，两者是同一类别。
   * 键生成统一走 productKeyOf，它按 canonicalCategory 归一。
   */
  it('直条/螺纹钢是同一类别：价格表按直条存也能导入到螺纹钢行', () => {
    const threadRow: PriceRow = {
      ...row('t', 'HRB400E', 12),
      category: '螺纹钢',
    }
    const { inputs, stats } = importLowestQuotes(
      sheet({ rows: [threadRow], brands: [{ name: '中天', freight: 0 }] }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.added).toBe(1)
    expect(inputs['中天:t']?.spot).toBe(3420)
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

    const hit = importLowestQuotes(panluoSheet, [
      quote('中天', 8, 3980, {
        category: '盘螺',
        material: 'HRB400',
        length: '-',
      }),
    ])
    expect(hit.stats.added).toBe(1)
    expect(hit.inputs['中天:p']?.spot).toBe(3980)

    const miss = importLowestQuotes(panluoSheet, [
      quote('中天', 8, 3980, {
        category: '盘螺',
        material: 'HRB400',
        length: '',
      }),
    ])
    expect(miss.stats.added).toBe(0)
    expect(miss.inputs['中天:p']).toBeUndefined()
  })

  it('品牌不匹配的报价不会落到别的品牌列', () => {
    const { inputs, stats } = importLowestQuotes(sheet(), [
      quote('杭钢', 12, 3420),
    ])
    expect(stats.added).toBe(0)
    expect(inputs).toEqual({})
  })

  it('同一格出现多条报价时取更低者, 与入参顺序无关', () => {
    const { inputs } = importLowestQuotes(sheet(), [
      quote('中天', 12, 3450),
      quote('中天', 12, 3400),
    ])
    expect(inputs['中天:a']?.spot).toBe(3400)
  })

  it('规格不匹配时不填(商品键含类别/材质/规格/定尺)', () => {
    const { stats } = importLowestQuotes(sheet(), [quote('中天', 14, 3420)])
    expect(stats.added).toBe(0)
  })

  it('空白商品行(未选商品)不参与导入', () => {
    const empty: PriceRow = {
      id: 'e',
      rowType: 'PRODUCT',
      category: '',
      material: '',
      spec: null,
      length: '',
    }
    const { stats } = importLowestQuotes(
      sheet({
        rows: [empty],
        brands: [{ name: '中天', freight: 0 }],
        inputs: { '中天:e': { spot: 3000 } },
      }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.added).toBe(0)
    expect(stats.cleared).toBe(0)
  })
})

/**
 * 抗震牌号代取（二级匹配）。
 *
 * <p>用「行材质 HRB400 / 报价只有 HRB400E」的数据锁定：精确材质取不到时才代取，
 * 代取必须留下来源材质，开关关闭时代取必须完全不发生；精确命中必须清掉旧的来源标记
 * （否则旧 E 角标会残留）。</p>
 */
describe('importLowestQuotes 抗震牌号代取', () => {
  const hrb400Sheet = (overrides: Partial<PriceSheet> = {}): PriceSheet =>
    sheet({ rows: [row('a', 'HRB400', 12)], ...overrides })

  it('开关关闭时不做代取: 只有 HRB400E 报价不会写进 HRB400 行', () => {
    const { stats, inputs } = importLowestQuotes(hrb400Sheet(), [
      quote('中天', 12, 3420),
    ])
    expect(stats.added).toBe(0)
    expect(stats.substituted).toBe(0)
    expect(inputs['中天:a']).toBeUndefined()
  })

  it('开关打开时代取生效, 并记录下来源材质', () => {
    const { inputs, stats } = importLowestQuotes(
      hrb400Sheet(),
      [quote('中天', 12, 3420)],
      { allowHrb400eFallback: true },
    )
    expect(stats.added).toBe(1)
    expect(stats.substituted).toBe(1)
    const cell = inputs['中天:a']
    expect(cell.spot).toBe(3420)
    // 落库字段: 重新打开单据后角标要据此显示
    expect(cell.spotSourceMaterial).toBe('HRB400E')
    // 供应商仍随价一起带
    expect(cell.supplierName).toBe('物产中大')
  })

  it('精确材质优先于代取, 且精确命中会清掉旧的来源标记', () => {
    const { inputs, stats } = importLowestQuotes(
      hrb400Sheet({
        inputs: {
          '中天:a': {
            spot: 3300,
            spotSourceMaterial: 'HRB400E',
            supplierId: '1',
          },
        },
      }),
      [
        quote('中天', 12, 3400, { material: 'HRB400' }),
        quote('中天', 12, 3300),
      ],
      { allowHrb400eFallback: true },
    )
    expect(stats.updated).toBe(1)
    expect(stats.substituted).toBe(0)
    expect(inputs['中天:a'].spot).toBe(3400)
    // 旧的代取来源必须消失，否则 E 角标会继续显示
    expect(inputs['中天:a'].spotSourceMaterial).toBeUndefined()
    // 来源标记被删除而不是置 null（不允许手工改价后，null 语义已无用）
    expect('spotSourceMaterial' in inputs['中天:a']).toBe(false)
  })

  it('已有代取价、本次仍代取命中: 来源保留且价格刷新', () => {
    const { inputs, stats } = importLowestQuotes(
      hrb400Sheet({
        inputs: { '中天:a': { spot: 3300, spotSourceMaterial: 'HRB400E' } },
      }),
      [quote('中天', 12, 3420)],
      { allowHrb400eFallback: true },
    )
    expect(stats.updated).toBe(1)
    expect(stats.substituted).toBe(1)
    expect(inputs['中天:a'].spot).toBe(3420)
    expect(inputs['中天:a'].spotSourceMaterial).toBe('HRB400E')
  })

  it('已是抗震牌号的行不会被反向代取', () => {
    // 行材质 HRB400E, 报价只有 HRB400: substituteMaterialOf 对已带 E 的牌号返回 null
    const { stats } = importLowestQuotes(
      sheet({ rows: [row('a', 'HRB400E', 12)] }),
      [quote('中天', 12, 3400, { material: 'HRB400' })],
      { allowHrb400eFallback: true },
    )
    expect(stats.added).toBe(0)
  })

  it('非 HRB 系列材质不参与代取(盘螺 HPB300)', () => {
    const { stats } = importLowestQuotes(
      sheet({ rows: [row('a', 'HPB300', 8)] }),
      [quote('中天', 8, 3500, { material: 'HPB300E' })],
      { allowHrb400eFallback: true },
    )
    expect(stats.added).toBe(0)
  })

  // 下面几条钉住「白名单收敛」：扩容必须经产品确认，不能顺手加
  it('白名单只有 HRB400: HRB500 / HRB335 当前不代取', () => {
    const hrb500 = importLowestQuotes(
      sheet({ rows: [row('a', 'HRB500', 12)] }),
      [quote('中天', 12, 3600, { material: 'HRB500E' })],
      { allowHrb400eFallback: true },
    )
    expect(hrb500.stats.added).toBe(0)
    const hrb335 = importLowestQuotes(
      sheet({ rows: [row('a', 'HRB335', 12)] }),
      [quote('中天', 12, 3300, { material: 'HRB335E' })],
      { allowHrb400eFallback: true },
    )
    expect(hrb335.stats.added).toBe(0)
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

describe('importLowestQuotes 锁定行与幂等', () => {
  it('锁定行的价格照常被导入刷新(行锁只冻结规格/吨位)', () => {
    const lockedRow: PriceRow = { ...row('a', 'HRB400E', 12), locked: true }
    const { inputs, stats } = importLowestQuotes(
      sheet({
        rows: [lockedRow],
        brands: [{ name: '中天', freight: 0 }],
        inputs: { '中天:a': { spot: 3000 } },
      }),
      [quote('中天', 12, 3420)],
    )
    expect(stats.updated).toBe(1)
    expect(inputs['中天:a'].spot).toBe(3420)
  })

  it('连续两次导入, 第二次 added/updated/cleared 全为 0(幂等)', () => {
    const quotes = [quote('中天', 12, 3420), quote('中杭', 12, 3450)]
    const first = importLowestQuotes(sheet(), quotes)
    expect(first.stats.added).toBe(2)

    const second = importLowestQuotes(sheet({ inputs: first.inputs }), quotes)
    expect(second.stats.added).toBe(0)
    expect(second.stats.updated).toBe(0)
    expect(second.stats.cleared).toBe(0)
    expect(second.stats.unchanged).toBe(2)
    expect(second.inputs).toEqual(first.inputs)
  })

  it('无任何报价时全部清空, cleared 等于原有价位数', () => {
    const { inputs, stats } = importLowestQuotes(
      sheet({
        inputs: {
          '中天:a': { spot: 3400 },
          '中杭:a': { spot: 3450 },
        },
      }),
      [],
    )
    expect(stats.cleared).toBe(2)
    expect(inputs).toEqual({})
  })

  it('纯函数: 不修改入参 inputs', () => {
    const source = sheet({
      inputs: {
        '中天:a': { spot: 3400, spotSourceMaterial: 'HRB400E' },
        '中杭:a': { spot: 3450 },
      },
    })
    importLowestQuotes(source, [quote('中天', 12, 3420)])
    expect(source.inputs['中天:a']).toEqual({
      spot: 3400,
      spotSourceMaterial: 'HRB400E',
    })
    expect(source.inputs['中杭:a']).toEqual({ spot: 3450 })
  })

  it('保留同格的非价格字段(吨位)', () => {
    const { inputs } = importLowestQuotes(
      sheet({ inputs: { '中天:a': { ton: 12.5, spot: 3400 } } }),
      [quote('中天', 12, 3420)],
    )
    expect(inputs['中天:a'].ton).toBe(12.5)
    expect(inputs['中天:a'].spot).toBe(3420)
  })
})
