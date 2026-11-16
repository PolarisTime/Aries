import { describe, expect, it } from 'vitest'
import type { BrandLowestQuote } from '@/api/market/supplier-price-lists'
import {
  applyRowLock,
  buildVarietyOptions,
  canonicalCategory,
  categoriesOf,
  computeSummary,
  dataKeyOf,
  deriveSheetPricing,
  filterVarieties,
  isSeparatorRow,
  LOCK_REASON_KEYS,
  makeRow,
  makeSeparatorRow,
  matchesToData,
  mergePriceData,
  moveItem,
  netPrice,
  netPriceWithFallback,
  pickBestDiffBrands,
  resolveLock,
  SHEET_COLUMN_WIDTH,
  SHEET_WIDTH_BASE_FONT_SIZE,
  scaleSheetColumnWidth,
  sheetColumnWidths,
  TON_INPUT_WIDTH_EM,
  varietyKeyOf,
  withStoredVarieties,
} from './core'
import type { Brand, PriceData, PriceRow, PriceSheet, Variety } from './types'

const data: PriceData = {
  '2026-09-10': {
    '9:30 上午': {
      中天: {
        '螺纹钢|HRB400E': { '12': 3320, '16': 3270 },
        '盘螺|HRB400E': { '6': 3880 },
      },
    },
  },
}

const row12: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}
const row12m: PriceRow = { ...row12, id: 'r2', length: '12米' }
const brands: Brand[] = [{ name: '中天', freight: 30 }]

/**
 * 定尺主数据（`md_length_premium`）在测试里的替身：定尺名称 → 每吨加价。
 *
 * <p>用它锁定「主数据驱动」新口径：`row.length` 命中即加、未命中 0，
 * 不再有「仅螺纹钢」这类写死的类别门禁。</p>
 */
const lengthPremiums12: Readonly<Record<string, number>> = { '12米': 30 }
/** 空主数据：用于验证**迁移兜底**（旧口径：仅螺纹钢 12米 按 `legacyPremium` 加价）。 */
const noLengthPremiums: Readonly<Record<string, number>> = {}

describe('netPrice', () => {
  it('命中网价并按定尺主数据叠加加价', () => {
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row12,
        lengthPremiums12,
      ),
    ).toBe(3320)
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row12m,
        lengthPremiums12,
      ),
    ).toBe(3350)
  })

  it('主数据 10米→20 时，10米行加价生效（新增定尺不需要改代码）', () => {
    const row10m: PriceRow = { ...row12, id: 'r10', length: '10米' }
    const lengthPremiums10: Readonly<Record<string, number>> = { '10米': 20 }
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row10m,
        lengthPremiums10,
      ),
    ).toBe(3340)
    // 同一份主数据里没有 12米：12米行不加价（未命中为 0，不沿用旧口径）。
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row12m,
        lengthPremiums10,
      ),
    ).toBe(3320)
  })

  it('主数据为空时回退旧行为（迁移兜底：仅螺纹钢 12米）', () => {
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row12,
        noLengthPremiums,
        30,
      ),
    ).toBe(3320)
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        row12m,
        noLengthPremiums,
        30,
      ),
    ).toBe(3350)
  })

  it('无数据/无品牌/无材质时返回 undefined', () => {
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '亚新',
        row12,
        lengthPremiums12,
      ),
    ).toBeUndefined()
    expect(
      netPrice(
        data,
        '2026-09-11',
        '9:30 上午',
        '中天',
        row12,
        lengthPremiums12,
      ),
    ).toBeUndefined()
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        { ...row12, material: 'HRB500E' },
        lengthPremiums12,
      ),
    ).toBeUndefined()
  })
})

describe('computeSummary', () => {
  const sheet = (inputs: PriceSheet['inputs']): PriceSheet => ({
    id: 's1',
    name: 's',
    projectId: '',
    projectName: '',
    orderDate: '2026-09-09',
    refDate: '2026-09-10',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    status: 'QUOTING',
    rows: [],
    inputs,
  })

  it('差价 = 网价 − 现货 − 运费, 统计已填格数', () => {
    const summary = computeSummary(
      data,
      sheet({ '_:r1': { ton: 10 }, '中天:r1': { spot: 3280 } }),
      [row12],
      brands,
      lengthPremiums12,
    )
    expect(summary.filled).toBe(1)
  })

  it('缺现货时不计入已填数', () => {
    expect(
      computeSummary(
        data,
        sheet({ '中天:r1': { spot: 3280 } }),
        [row12],
        brands,
        lengthPremiums12,
      ).filled,
    ).toBe(1)
    expect(
      computeSummary(
        data,
        sheet({ '_:r1': { ton: 10 } }),
        [row12],
        brands,
        lengthPremiums12,
      ).filled,
    ).toBe(0)
  })

  it('主数据有值时按定尺加价，不再有类别门禁', () => {
    const rowRebar12: PriceRow = {
      id: 'x',
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
    }
    const rowRound12: PriceRow = {
      id: 'y',
      category: '圆钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
    }
    const dataRound: PriceData = {
      '2026-09-10': {
        '9:30 上午': { 中天: { '圆钢|HRB400E': { '12': 4000 } } },
      },
    }
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        rowRebar12,
        lengthPremiums12,
      ),
    ).toBe(3350)
    // 旧口径只给螺纹钢加价；主数据驱动后，圆钢 12米 命中主数据同样加价。
    expect(
      netPrice(
        dataRound,
        '2026-09-10',
        '9:30 上午',
        '中天',
        rowRound12,
        lengthPremiums12,
      ),
    ).toBe(4030)
  })

  it('主数据为空时回退旧行为：圆钢 12米 不加价', () => {
    const rowRound12: PriceRow = {
      id: 'y',
      category: '圆钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
    }
    const dataRound: PriceData = {
      '2026-09-10': {
        '9:30 上午': { 中天: { '圆钢|HRB400E': { '12': 4000 } } },
      },
    }
    expect(
      netPrice(
        dataRound,
        '2026-09-10',
        '9:30 上午',
        '中天',
        rowRound12,
        noLengthPremiums,
        30,
      ),
    ).toBe(4000)
  })
})

describe('netPriceWithFallback', () => {
  const dataE: PriceData = {
    '2026-09-10': {
      上午: { 中天: { '螺纹钢|HRB400E': { '12': 3320 } } },
    },
  }
  const hrb400 = { ...row12, material: 'HRB400' }

  it('HRB400 无价且开启兜底时用 HRB400E 价格', () => {
    const result = netPriceWithFallback(
      dataE,
      '2026-09-10',
      '上午',
      '中天',
      hrb400,
      noLengthPremiums,
      true,
    )
    expect(result.value).toBe(3320)
    expect(result.fallback).toBe(true)
  })

  it('关闭兜底时返回空', () => {
    const result = netPriceWithFallback(
      dataE,
      '2026-09-10',
      '上午',
      '中天',
      hrb400,
      noLengthPremiums,
      false,
    )
    expect(result.value).toBeUndefined()
  })

  it('HRB400 自身有价时优先, 不标记 fallback', () => {
    const result = netPriceWithFallback(
      data,
      '2026-09-10',
      '9:30 上午',
      '中天',
      row12,
      lengthPremiums12,
      true,
    )
    expect(result.value).toBe(3320)
    expect(result.fallback).toBe(false)
  })
})

describe('deriveSheetPricing（表格与批次角标共用的唯一出口）', () => {
  const sheetOf = (overrides: Partial<PriceSheet> = {}): PriceSheet => ({
    id: 's1',
    name: 's',
    projectId: '',
    projectName: '',
    orderDate: '2026-09-09',
    refDate: '2026-09-10',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    status: 'QUOTING',
    rows: [],
    inputs: {},
    ...overrides,
  })

  const quoteOf = (
    material: string,
    spec: number,
    price: number,
  ): BrandLowestQuote => ({
    brandName: '中天',
    category: '螺纹钢',
    material,
    spec,
    length: '9米',
    price,
    priceListId: '900',
    supplierId: 's2',
    supplierName: '河钢',
    updatedAt: '2026-11-14T03:20:00Z',
  })

  it('报价命中：不缺价，inputs 带价格与供应商', () => {
    const pricing = deriveSheetPricing(
      sheetOf({ rows: [row12], brands }),
      [quoteOf('HRB400E', 12, 3420)],
      { data },
    )

    expect(pricing.missingCount).toBe(0)
    expect(pricing.inputs['中天:r1']?.spot).toBe(3420)
    expect(pricing.inputs['中天:r1']?.supplierName).toBe('河钢')
  })

  it('有网价但报价未命中：计 1 个缺价，且不保留快照里的旧价', () => {
    const pricing = deriveSheetPricing(
      sheetOf({
        rows: [row12],
        brands,
        inputs: { '中天:r1': { spot: 3300 } },
      }),
      [],
      { data },
    )

    expect(pricing.missingCount).toBe(1)
    expect(pricing.inputs['中天:r1']).toBeUndefined()
  })

  it('没有网价的格子不算缺价（口径是「有网价但没现货」）', () => {
    const rowNoAuto: PriceRow = { ...row12, id: 'r2', material: 'HRB500' }
    const pricing = deriveSheetPricing(
      sheetOf({ rows: [row12, rowNoAuto], brands }),
      [quoteOf('HRB400E', 12, 3420)],
      { data },
    )

    expect(pricing.missingCount).toBe(0)
    expect(pricing.inputs['中天:r2']).toBeUndefined()
  })

  it('HRB400E 代取命中时不算缺价 —— 与旧「持久化快照」口径不同', () => {
    // 网价按 HRB400 存；供应商只报了 HRB400E（代取候选）
    const dataHrb400: PriceData = {
      '2026-09-10': {
        '9:30 上午': {
          中天: {
            '螺纹钢|HRB400': { '12': 3300 },
            '螺纹钢|HRB400E': { '12': 3320 },
          },
        },
      },
    }
    const hrb400Row: PriceRow = { ...row12, id: 'h1', material: 'HRB400' }
    // 持久化快照里没有价（派生结果不落库）—— 旧的 countMissing 会把它算成缺价
    const sheet = sheetOf({ rows: [hrb400Row], brands, inputs: {} })

    const strict = deriveSheetPricing(sheet, [quoteOf('HRB400E', 12, 3420)], {
      data: dataHrb400,
    })
    expect(strict.missingCount).toBe(1)
    expect(strict.inputs['中天:h1']).toBeUndefined()

    const withFallback = deriveSheetPricing(
      sheet,
      [quoteOf('HRB400E', 12, 3420)],
      { allowHrb400eFallback: true, data: dataHrb400 },
    )
    // 表格会显示代取价 → 角标不能再报缺价
    expect(withFallback.missingCount).toBe(0)
    expect(withFallback.inputs['中天:h1']?.spot).toBe(3420)
    expect(withFallback.inputs['中天:h1']?.spotSourceMaterial).toBe('HRB400E')
  })

  it('显式 rows/brands 覆盖 sheet 快照（表格侧实时行）', () => {
    const pricing = deriveSheetPricing(
      sheetOf({ rows: [], brands: [] }),
      [quoteOf('HRB400E', 12, 3420)],
      { data, rows: [row12], brands },
    )

    expect(pricing.missingCount).toBe(0)
    expect(pricing.inputs['中天:r1']?.spot).toBe(3420)
  })

  it('refDate/refPeriod 为空时按同一份 data 解析后才判缺价', () => {
    const pricing = deriveSheetPricing(
      sheetOf({ rows: [row12], brands, refDate: '', refPeriod: '' }),
      [quoteOf('HRB400E', 12, 3420)],
      { data },
    )

    // 解析到 2026-09-10 / 9:30 上午 → 有网价、有报价 → 不缺
    expect(pricing.missingCount).toBe(0)
    expect(pricing.inputs['中天:r1']?.spot).toBe(3420)
  })
})

describe('canonicalCategory / dataKeyOf', () => {
  it('螺纹钢 与 直条 归一为同一类别', () => {
    expect(canonicalCategory('直条')).toBe('螺纹钢')
    expect(canonicalCategory('盘螺')).toBe('盘螺')
    const rebar = { ...row12, category: '螺纹钢' }
    const straight = { ...row12, category: '直条' }
    expect(dataKeyOf(rebar)).toBe('螺纹钢|HRB400E')
    expect(dataKeyOf(straight)).toBe(dataKeyOf(rebar))
  })

  it('匹配结果的直条类别归并到螺纹钢键', () => {
    const patch = matchesToData([
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: '14',
        status: '匹配',
        quoteDate: '2026-09-11',
        period: '上午',
        basePrice: 3300,
      },
    ])
    expect(patch['2026-09-11'].上午.中天['螺纹钢|HRB400E']['14']).toBe(3300)
  })
})

describe('matchesToData / mergePriceData', () => {
  it('按 日期/时段/品牌/类别|材质/规格 归并 basePrice', () => {
    const patch = matchesToData([
      {
        brand: '万泰',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: '12',
        status: '匹配',
        quoteDate: '2026-09-11',
        period: '上午',
        basePrice: '3290.00',
      },
      {
        brand: '万泰',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: '12',
        status: '无网价',
        quoteDate: '2026-09-11',
        period: '上午',
        basePrice: null,
      },
    ])
    expect(patch['2026-09-11'].上午.万泰['螺纹钢|HRB400E']['12']).toBe(3290)
  })

  it('深合并保留既有日期数据', () => {
    const base = {
      '2026-09-10': { 上午: { 中天: { '螺纹钢|HRB400': { '12': 3200 } } } },
    }
    const patch = matchesToData([
      {
        brand: '万泰',
        category: '盘螺',
        material: 'HRB400',
        spec: '8',
        status: '匹配',
        quoteDate: '2026-09-11',
        period: '上午',
        basePrice: 3500,
      },
    ])
    const merged = mergePriceData(base, patch)
    expect(merged['2026-09-10'].上午.中天['螺纹钢|HRB400']['12']).toBe(3200)
    expect(merged['2026-09-11'].上午.万泰['盘螺|HRB400']['8']).toBe(3500)
  })
})

describe('moveItem', () => {
  it('按位置移动元素, 越界或同位置时原样返回', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('makeRow', () => {
  it('makeRow 生成扁平的空白行', () => {
    const row = makeRow()
    expect(row.id).toBeTruthy()
    expect('groupId' in row).toBe(false)
    expect(row.rowType).toBe('PRODUCT')
    expect(row.category).toBe('')
    expect(row.material).toBe('')
    expect(row.spec).toBeNull()
    expect(row.length).toBe('')
  })
})

describe('隔断行', () => {
  it('makeSeparatorRow 生成 rowType=SEPARATOR 的空行', () => {
    const row = makeSeparatorRow()
    expect(row.id).toBeTruthy()
    expect(row.rowType).toBe('SEPARATOR')
    expect(row.category).toBe('')
    expect(row.material).toBe('')
    expect(row.spec).toBeNull()
    expect(row.length).toBe('')
  })

  it('isSeparatorRow 仅对 rowType=SEPARATOR 为真, 缺省视为商品行', () => {
    expect(isSeparatorRow(makeSeparatorRow())).toBe(true)
    expect(isSeparatorRow(makeRow())).toBe(false)
    expect(isSeparatorRow({ rowType: undefined })).toBe(false)
  })
})

describe('filterVarieties 可选商品过滤', () => {
  const varieties: Variety[] = [
    {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
      label: 'a',
    },
    {
      category: '盘螺',
      material: 'HRB400E',
      spec: 8,
      length: '9米',
      label: 'b',
    },
  ]

  it('无品牌配置时保留全部类别', () => {
    expect(filterVarieties(varieties, [], undefined)).toHaveLength(2)
  })

  it('按品牌启用类别过滤; 品牌未配置类别视为全部启用', () => {
    const all = filterVarieties(
      varieties,
      [{ name: '中天', freight: 0 }],
      undefined,
    )
    expect(all.map((item) => item.category)).toEqual(['螺纹钢', '盘螺'])
    const onlyThread = filterVarieties(
      varieties,
      [{ name: '中天', freight: 0, categories: ['螺纹钢'] }],
      undefined,
    )
    expect(onlyThread.map((item) => item.category)).toEqual(['螺纹钢'])
  })

  it('项目白名单存在时仅保留白名单商品', () => {
    const result = filterVarieties(varieties, [], ['盘螺|HRB400E|8|9米'])
    expect(result.map((item) => item.category)).toEqual(['盘螺'])
  })
})

/**
 * 守卫: 类别清单必须**从数据派生**, 不许退回写死一份。
 *
 * <p>这几条用例用数据里原本不存在的「H型钢」当探针：只要有人把类别清单重新硬编码成
 * 螺纹钢/盘螺/高线/圆钢，新类别就会在下拉、分组、默认启用里三处同时消失，用例立刻变红。</p>
 */
describe('categoriesOf 类别派生守卫', () => {
  const newCategoryVariety = (): Variety => ({
    category: 'H型钢',
    material: 'Q235',
    spec: 200,
    length: '12米',
    label: 'h',
  })
  const threadVariety = (): Variety => ({
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    label: 'a',
  })

  it('按数据首次出现顺序去重, 并把「直条」按值别名归一为「螺纹钢」', () => {
    const varieties: Variety[] = [
      { ...threadVariety(), category: '直条' },
      { ...newCategoryVariety() },
      { ...threadVariety() },
    ]
    expect(categoriesOf(varieties)).toEqual(['螺纹钢', 'H型钢'])
  })

  it('空数据返回空清单(不再有兜底的四个类别)', () => {
    expect(categoriesOf([])).toEqual([])
  })

  it('品种下拉分组自动包含数据里的新类别', () => {
    const groups = buildVarietyOptions([threadVariety(), newCategoryVariety()])
    expect(groups.map((group) => group.label)).toEqual(['螺纹钢', 'H型钢'])
  })

  it('品牌未配置品种时, 新类别默认视为全选并被保留', () => {
    const result = filterVarieties(
      [threadVariety(), newCategoryVariety()],
      [{ name: '中天', freight: 0 }],
      undefined,
    )
    expect(result.map((item) => item.category)).toEqual(['螺纹钢', 'H型钢'])
  })

  it('品牌显式只勾了老类别时, 新类别仍被正确排除(不是无脑全放)', () => {
    const result = filterVarieties(
      [threadVariety(), newCategoryVariety()],
      [{ name: '中天', freight: 0, categories: ['螺纹钢'] }],
      undefined,
    )
    expect(result.map((item) => item.category)).toEqual(['螺纹钢'])
  })

  it('已删除的硬编码常量不再被导出', async () => {
    const core = await import('./core')
    expect('CATEGORIES' in core).toBe(false)
    expect('SPECS' in core).toBe(false)
    expect('LENGTHS' in core).toBe(false)
    // 长度互切不再依赖写死的「双长度」常量（改为按实际存在的定尺集合计算）。
    expect('ALT_LENGTHS' in core).toBe(false)
  })
})

describe('applyRowLock 行级锁定(第二级锁: 纯编辑保护)', () => {
  it('锁定只把 locked 置为 true, 不动吨位/规格/价格', () => {
    const row: PriceRow = { ...row12, id: 'r1', ton: 12.5, locked: false }
    const next = applyRowLock(row, true)
    expect(next).toEqual({ ...row, locked: true })
    expect(next.ton).toBe(12.5)
    expect(next.spec).toBe(row.spec)
  })

  it('解锁只把 locked 置回 false, 不代表任何业务解绑', () => {
    const row: PriceRow = { ...row12, id: 'r1', ton: 30, locked: true }
    const next = applyRowLock(row, false)
    expect(next).toEqual({ ...row, locked: false })
    expect(next.ton).toBe(30)
  })

  it('锁定与解锁都是纯函数, 不修改入参', () => {
    const row: PriceRow = { ...row12, id: 'r1', ton: 8, locked: false }
    applyRowLock(row, true)
    applyRowLock(row, false)
    expect(row.locked).toBe(false)
    expect(row.ton).toBe(8)
  })
})

describe('resolveLock 锁定层级与优先级', () => {
  it('三种层级都不命中时返回未锁定, 且不带层级', () => {
    expect(resolveLock({})).toEqual({ locked: false })
    expect(resolveLock({ sheet: false, row: false, cell: false })).toEqual({
      locked: false,
    })
  })

  it('单层命中时只读并给出该层级', () => {
    expect(resolveLock({ sheet: true })).toEqual({
      locked: true,
      level: 'sheet',
    })
    expect(resolveLock({ row: true })).toEqual({ locked: true, level: 'row' })
    expect(resolveLock({ cell: true })).toEqual({ locked: true, level: 'cell' })
  })

  it('多层叠加时取优先级最高的层级(单据 > 行 > 单元格)', () => {
    expect(resolveLock({ sheet: true, row: true, cell: true })).toEqual({
      locked: true,
      level: 'sheet',
    })
    expect(resolveLock({ row: true, cell: true })).toEqual({
      locked: true,
      level: 'row',
    })
    expect(resolveLock({ sheet: true, cell: true })).toEqual({
      locked: true,
      level: 'sheet',
    })
  })

  it('只认严格 true: 缺省/ undefined 不构成锁定', () => {
    expect(resolveLock({ sheet: undefined, row: undefined })).toEqual({
      locked: false,
    })
  })
})

describe('LOCK_REASON_KEYS 层级原因文案', () => {
  it('每个层级都有唯一且稳定的 i18n key', () => {
    expect(Object.keys(LOCK_REASON_KEYS).sort()).toEqual([
      'cell',
      'row',
      'sheet',
    ])
    for (const key of Object.values(LOCK_REASON_KEYS)) {
      expect(key.startsWith('priceCompare.sheet.')).toBe(true)
    }
    expect(new Set(Object.values(LOCK_REASON_KEYS)).size).toBe(3)
  })
})

describe('列宽按字号自适应', () => {
  it('基准字号(14px)下列宽取基准值', () => {
    expect(scaleSheetColumnWidth(SHEET_COLUMN_WIDTH.spec, 14)).toBe(
      SHEET_COLUMN_WIDTH.spec,
    )
    const widths = sheetColumnWidths(14)
    expect(widths.spec).toBe(SHEET_COLUMN_WIDTH.spec)
    expect(widths.ton).toBe(SHEET_COLUMN_WIDTH.ton)
  })

  it('字号 16/18 全列等比放大(吨位列同样随字号缩放)', () => {
    for (const fontSize of [16, 18]) {
      const widths = sheetColumnWidths(fontSize)
      // 「材质 / 规格 / 长度」列放不下时会截断, 必须有足够增量
      expect(widths.spec).toBe(
        Math.round((SHEET_COLUMN_WIDTH.spec * fontSize) / 14),
      )
      expect(widths.supplier).toBeGreaterThan(SHEET_COLUMN_WIDTH.supplier)
      for (const [key, base] of Object.entries(SHEET_COLUMN_WIDTH)) {
        expect(widths[key as keyof typeof SHEET_COLUMN_WIDTH]).toBe(
          Math.round((base * fontSize) / 14),
        )
      }
    }
  })

  it('字号单调递增时列宽单调不减', () => {
    const widths = [11, 12, 13, 14, 16, 18].map((fontSize) =>
      sheetColumnWidths(fontSize),
    )
    for (let index = 1; index < widths.length; index += 1) {
      for (const key of Object.keys(SHEET_COLUMN_WIDTH)) {
        expect(
          widths[index][key as keyof typeof SHEET_COLUMN_WIDTH],
        ).toBeGreaterThanOrEqual(
          widths[index - 1][key as keyof typeof SHEET_COLUMN_WIDTH],
        )
      }
    }
  })

  it('非法字号回落到基准字号, 不产生 0 宽列', () => {
    for (const fontSize of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sheetColumnWidths(fontSize)).toEqual(sheetColumnWidths(14))
    }
    expect(SHEET_WIDTH_BASE_FONT_SIZE).toBe(14)
  })

  it('18px 时「材质 / 规格 / 长度」列足以容纳最长商品文案', () => {
    const widths = sheetColumnWidths(18)
    // 最长组合: HRB400E(7) + 空格 + 12(2) + 空格 + 9米(2) ≈ 14 个半角宽字符
    const longestLabelWidthAt14px = 132
    expect(widths.spec).toBeGreaterThanOrEqual(
      Math.ceil((longestLabelWidthAt14px * 18) / 14),
    )
  })

  /*
   * 数字列(现货价 / 网价 / 差价)按 4 位数字立契约。
   *
   * 真机实测(PingFang SC, tabular-nums): 每位数字宽 0.6em, 14px 字号下 4 位数字 = 33.6px;
   * 单元格左右留白合计 12px(再加 1px 边框/取整); 现货价的 antd small 输入框左右内边距各 7px
   * (共 14px, 不随字号缩放), 差价角标左右内边距各 4px(共 8px)。列宽必须覆盖这些固定开销,
   * 否则末位数字被裁。
   */
  const DIGIT_WIDTH_EM = 0.6
  const CELL_CHROME = 13
  const SPOT_INPUT_PADDING = 14
  const DIFF_CHIP_PADDING = 8
  const digits4Width = (fontSize: number) =>
    Math.ceil(4 * DIGIT_WIDTH_EM * fontSize)
  /** 现货价: 数字 + 输入框内边距 + 单元格留白。 */
  const requiredSpotWidth = (fontSize: number) =>
    digits4Width(fontSize) + SPOT_INPUT_PADDING + CELL_CHROME
  /** 网价: 纯文本数字 + 单元格留白。 */
  const requiredNetWidth = (fontSize: number) =>
    digits4Width(fontSize) + CELL_CHROME
  /** 差价: 数字 + 角标内边距 + 单元格留白。 */
  const requiredDiffWidth = (fontSize: number) =>
    digits4Width(fontSize) + DIFF_CHIP_PADDING + CELL_CHROME

  it('14/16/18 三档下 spot/net/diff 都容得下 4 位数字', () => {
    for (const fontSize of [14, 16, 18]) {
      const widths = sheetColumnWidths(fontSize)
      expect(widths.spot).toBeGreaterThanOrEqual(requiredSpotWidth(fontSize))
      expect(widths.net).toBeGreaterThanOrEqual(requiredNetWidth(fontSize))
      expect(widths.diff).toBeGreaterThanOrEqual(requiredDiffWidth(fontSize))
    }
  })

  it('现货价列宽回归保护: 58 在 14px 下不足(实测 input.clientWidth=45 < 48)', () => {
    // 阈值 61 是「4 位数字 + 输入框内边距 + 单元格留白」在基准字号下的下界
    expect(requiredSpotWidth(SHEET_WIDTH_BASE_FONT_SIZE)).toBe(61)
    expect(SHEET_COLUMN_WIDTH.spot).toBeGreaterThanOrEqual(
      requiredSpotWidth(SHEET_WIDTH_BASE_FONT_SIZE),
    )
    // 旧的 58 会让输入框内容宽只剩 45px, 4 位数字(48px)显示不全
    expect(58).toBeLessThan(requiredSpotWidth(SHEET_WIDTH_BASE_FONT_SIZE))
  })

  it('差价列宽回归保护: 角标在 14px 下不得越出单元格', () => {
    expect(requiredDiffWidth(SHEET_WIDTH_BASE_FONT_SIZE)).toBe(55)
    expect(SHEET_COLUMN_WIDTH.diff).toBeGreaterThanOrEqual(
      requiredDiffWidth(SHEET_WIDTH_BASE_FONT_SIZE),
    )
  })

  /*
   * 报单吨位列的宽度契约。
   *
   * 该列只放 4.75em 输入框 + 单元格留白(左右各约 6.5px), 84 足够, 且不随内容变化;
   * 已开/未开两列随采购功能一并移除, 这里不再有按内容定宽的例外。
   */
  it('报单吨位列: 84px 容得下 4.75em 输入框, 且随字号等比缩放', () => {
    expect(SHEET_COLUMN_WIDTH.ton).toBe(84)
    expect(TON_INPUT_WIDTH_EM).toBe(4.75)
    expect(SHEET_COLUMN_WIDTH.ton).toBeGreaterThan(TON_INPUT_WIDTH_EM * 14 + 13)
    for (const fontSize of [11, 12, 13, 14, 16, 18]) {
      expect(sheetColumnWidths(fontSize).ton).toBe(
        scaleSheetColumnWidth(SHEET_COLUMN_WIDTH.ton, fontSize),
      )
    }
  })

  /*
   * 供应商简称列「4 个汉字完整可见」的契约。
   *
   * 真机实测(PingFang SC, antd v6 Select): 简称显示在 `.ant-select-content` 内, 汉字宽度 = 1em
   * (14px 下 4 字 = 56px); 列宽里另有一截开销 —— 单元格左右留白 + Select 根节点左右内边距 +
   * content 右外边距 + 尾部箭头, 实测 14px 档 47px、16px 档 49px、18px 档 52px。
   * 旧列宽 92px 在基准字号下只给 content 45px(clientWidth), 4 字被省略成「中天钢…」。
   */
  const ABBR_CHAR_COUNT = 4
  const SUPPLIER_CELL_CHROME: Record<number, number> = {
    14: 47,
    16: 49,
    18: 52,
  }
  /** 简称列实际可用的文本宽(px), 按实测开销扣除。 */
  const supplierAvailableWidth = (fontSize: number) =>
    sheetColumnWidths(fontSize).supplier -
    (SUPPLIER_CELL_CHROME[fontSize] ?? 52)

  it('14/16/18 三档下简称列都容得下 4 个汉字', () => {
    for (const fontSize of [14, 16, 18]) {
      expect(supplierAvailableWidth(fontSize)).toBeGreaterThanOrEqual(
        ABBR_CHAR_COUNT * fontSize,
      )
    }
    // 与真机 clientWidth 对齐: 108 - 47 = 61px 可用 vs 56px 需求
    expect(supplierAvailableWidth(SHEET_WIDTH_BASE_FONT_SIZE)).toBe(61)
  })

  it('简称列宽回归保护: 92 在 14px 下放不下 4 个汉字(实测 content.clientWidth=45)', () => {
    expect(92 - SUPPLIER_CELL_CHROME[SHEET_WIDTH_BASE_FONT_SIZE]).toBeLessThan(
      ABBR_CHAR_COUNT * SHEET_WIDTH_BASE_FONT_SIZE,
    )
    expect(SHEET_COLUMN_WIDTH.supplier).toBeGreaterThanOrEqual(
      SUPPLIER_CELL_CHROME[SHEET_WIDTH_BASE_FONT_SIZE] +
        ABBR_CHAR_COUNT * SHEET_WIDTH_BASE_FONT_SIZE,
    )
  })
})

/**
 * 差价最优的并列判定。
 *
 * <p>回归的真实缺陷: 旧实现用 `diff > bestVal` 逐个比较并只记住一个品牌, 差价相同时
 * 只有遍历到的第一个被标蓝, 其余并列者被丢掉 —— 用户看到"明明一样便宜, 却只高亮一家"。</p>
 */
describe('pickBestDiffBrands', () => {
  it('差价唯一最高时只返回该品牌', () => {
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 20 },
        { brand: '沙钢', diff: 30 },
        { brand: '永钢', diff: 10 },
      ]),
    ).toEqual(['沙钢'])
  })

  it('差价并列最高时全部返回(不因先后顺序丢弃后来者)', () => {
    // 反例钉: 只记住第一个的实现会返回 ['中天']
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 30 },
        { brand: '沙钢', diff: 30 },
      ]),
    ).toEqual(['中天', '沙钢'])
    // 三家并列同样都要在
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 30 },
        { brand: '沙钢', diff: 30 },
        { brand: '永钢', diff: 30 },
      ]),
    ).toEqual(['中天', '沙钢', '永钢'])
  })

  it('低于最优的品牌不返回(并列只认最高档)', () => {
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 30 },
        { brand: '沙钢', diff: 30 },
        { brand: '永钢', diff: 20 },
      ]),
    ).toEqual(['中天', '沙钢'])
  })

  it('浮点末位误差不破坏并列判定', () => {
    // 20 与 20.000000000000004 业务上是同一档, 不能因浮点误差拆成两个最优
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 20 },
        { brand: '沙钢', diff: 20.000000000000004 },
      ]),
    ).toEqual(['中天', '沙钢'])
  })

  it('真实价差(超过半分钱)仍按不同档处理', () => {
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: 20 },
        { brand: '沙钢', diff: 20.01 },
      ]),
    ).toEqual(['沙钢'])
  })

  it('无有效报价的品牌被跳过; 全无报价时返回空数组', () => {
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: undefined },
        { brand: '沙钢', diff: 30 },
      ]),
    ).toEqual(['沙钢'])
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: undefined },
        { brand: '沙钢', diff: undefined },
      ]),
    ).toEqual([])
    expect(pickBestDiffBrands([])).toEqual([])
  })

  it('负差价同样按"最高"比较(全为负时取最接近 0 的)', () => {
    expect(
      pickBestDiffBrands([
        { brand: '中天', diff: -30 },
        { brand: '沙钢', diff: -10 },
        { brand: '永钢', diff: -10 },
      ]),
    ).toEqual(['沙钢', '永钢'])
  })
})

describe('withStoredVarieties：已保存的规格必须有 label', () => {
  const variety = (
    material: string,
    spec: number,
    length = '9米',
    category = '直条',
  ) => ({
    category,
    material,
    spec,
    length,
    label: `${material} ${spec} ${length}`,
  })

  it('把表里出现、但不在选项里的组合补到末尾（历史行 / 白名单收紧）', () => {
    const options = [variety('HRB400E', 12)]
    const rows = [
      {
        id: 'r1',
        rowType: 'PRODUCT' as const,
        category: '直条',
        material: 'HRB400',
        spec: 12,
        length: '9米',
      },
    ]
    const merged = withStoredVarieties(options, rows)
    expect(merged.map((item) => item.label)).toEqual([
      'HRB400E 12 9米',
      'HRB400 12 9米',
    ])
  })

  it('已在选项里的组合不重复追加，且保持原顺序', () => {
    const options = [variety('HRB400E', 12), variety('HRB400E', 14)]
    const rows = [
      {
        id: 'r1',
        rowType: 'PRODUCT' as const,
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
    ]
    expect(withStoredVarieties(options, rows)).toEqual(options)
  })

  it('隔断行与未选商品的行不参与补齐', () => {
    const rows = [
      {
        id: 's1',
        rowType: 'SEPARATOR' as const,
        category: '',
        material: '',
        spec: null,
        length: '',
      },
      {
        id: 'r2',
        rowType: 'PRODUCT' as const,
        category: '',
        material: '',
        spec: null,
        length: '',
      },
    ]
    expect(withStoredVarieties([], rows)).toEqual([])
  })

  /*
   * S15 的真实前置（项目 339483372885635072，库内实测）：
   * - 白名单含 `盘螺|HRB400|6|-`、`盘螺|HRB400|8|-`、`盘螺|HRB400|10|-` 与螺纹钢 HRB400E；
   * - 该批次已保存行是「直条 HRB400」12/14/16/20/25/28——`直条` 与白名单里的 `螺纹钢`
   *   不是同一个 varietyKey（`varietyKeyOf` 用原始 category），因此这 6 个才是范围外。
   * 结论：3 个盘螺 HRB400 是白名单合法项（必须仍可选），只有 6 个直条 HRB400 需要 disabled。
   */
  const projectAllowedProducts = [
    '盘螺|HRB400|6|-',
    '盘螺|HRB400|8|-',
    '盘螺|HRB400|10|-',
    '螺纹钢|HRB400E|12|9米',
  ]
  const projectVarieties: Variety[] = [
    variety('HRB400', 6, '-', '盘螺'),
    variety('HRB400', 8, '-', '盘螺'),
    variety('HRB400', 10, '-', '盘螺'),
    variety('HRB400E', 12, '9米', '螺纹钢'),
  ]
  /** 该批次已保存的 6 个范围外行（直条 HRB400）。 */
  const storedStraightRows = [12, 14, 16, 20, 25, 28].map((spec, index) => ({
    id: `r${index + 1}`,
    rowType: 'PRODUCT' as const,
    category: '直条',
    material: 'HRB400',
    spec,
    length: '9米',
  }))

  it('白名单内的盘螺 HRB400（6/8/10）保留为可选项，不是范围外', () => {
    const allowed = filterVarieties(
      projectVarieties,
      [],
      projectAllowedProducts,
    )

    expect(allowed.map((item) => varietyKeyOf(item))).toEqual([
      '盘螺|HRB400|6|-',
      '盘螺|HRB400|8|-',
      '盘螺|HRB400|10|-',
      '螺纹钢|HRB400E|12|9米',
    ])
  })

  it('只有 6 个范围外直条 HRB400 被补为 disabled；3 个白名单盘螺 HRB400 仍可选', () => {
    const allowed = filterVarieties(
      projectVarieties,
      [],
      projectAllowedProducts,
    )
    const flat = buildVarietyOptions(
      withStoredVarieties(allowed, storedStraightRows),
    ).flatMap((group) => group.options)
    const hrb400 = flat.filter((option) => option.label.startsWith('HRB400 '))
    const selectable = hrb400.filter((option) => !option.disabled)
    const outOfScope = hrb400.filter((option) => option.disabled === true)

    // 白名单内 3 个盘螺 HRB400：仍可选（display 不含长度，所以是「HRB400 6/8/10」）
    expect(selectable.map((option) => option.label)).toEqual([
      'HRB400 6',
      'HRB400 8',
      'HRB400 10',
    ])
    // 范围外 6 个直条 HRB400：全部 disabled，且回显 label 不为空
    expect(outOfScope).toHaveLength(6)
    expect(outOfScope.map((option) => option.label)).toContain('HRB400 12 9米')
    expect(outOfScope.every((option) => option.label.trim().length > 0)).toBe(
      true,
    )
    // HRB400E 白名单项不受影响
    const allowedHrb400e = flat.filter((option) =>
      option.label.startsWith('HRB400E '),
    )
    expect(allowedHrb400e[0]?.disabled).toBeUndefined()
  })
})
