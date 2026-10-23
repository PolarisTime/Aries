import { describe, expect, it } from 'vitest'
import {
  applyRowLock,
  buildVarietyOptions,
  canonicalCategory,
  categoriesOf,
  computeSummary,
  countMissing,
  dataKeyOf,
  estimateSheetTextWidth,
  fillSupplierInputs,
  filterSupplierOptionsByBrand,
  filterVarieties,
  findAlternateLengthVariety,
  isPurchasedRow,
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
  reconcileSpotInputs,
  requiredIssuedTonColumnWidth,
  requiredTonColumnWidth,
  resolveLock,
  SHEET_COLUMN_WIDTH,
  SHEET_WIDTH_BASE_FONT_SIZE,
  scaleSheetColumnWidth,
  sheetColumnWidths,
  sumTonByPurchaseOrderItem,
  syncSpotInputs,
  TON_CELL_FIXED_CHROME,
  TON_INPUT_WIDTH_EM,
  TON_PROGRESS_MIN_TEXT_WIDTH,
  TON_PROGRESS_TEXT_MAX_WIDTH,
  tonProgressLineWidth,
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

describe('netPrice', () => {
  it('命中网价并叠加 12 米加价', () => {
    expect(netPrice(data, '2026-09-10', '9:30 上午', '中天', row12, 30)).toBe(
      3320,
    )
    expect(netPrice(data, '2026-09-10', '9:30 上午', '中天', row12m, 30)).toBe(
      3350,
    )
  })

  it('无数据/无品牌/无材质时返回 undefined', () => {
    expect(
      netPrice(data, '2026-09-10', '9:30 上午', '亚新', row12, 30),
    ).toBeUndefined()
    expect(
      netPrice(data, '2026-09-11', '9:30 上午', '中天', row12, 30),
    ).toBeUndefined()
    expect(
      netPrice(
        data,
        '2026-09-10',
        '9:30 上午',
        '中天',
        { ...row12, material: 'HRB500E' },
        30,
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
    status: '报价',
    rows: [],
    inputs,
  })

  it('差价 = 网价 − 现货 − 运费, 统计已填格数', () => {
    const summary = computeSummary(
      data,
      sheet({ '_:r1': { ton: 10 }, '中天:r1': { spot: 3280 } }),
      [row12],
      brands,
      30,
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
        30,
      ).filled,
    ).toBe(1)
    expect(
      computeSummary(data, sheet({ '_:r1': { ton: 10 } }), [row12], brands, 30)
        .filled,
    ).toBe(0)
  })

  it('12 米加价仅螺纹钢生效', () => {
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
      netPrice(data, '2026-09-10', '9:30 上午', '中天', rowRebar12, 30),
    ).toBe(3350)
    expect(
      netPrice(dataRound, '2026-09-10', '9:30 上午', '中天', rowRound12, 30),
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
      30,
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
      30,
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
      30,
      true,
    )
    expect(result.value).toBe(3320)
    expect(result.fallback).toBe(false)
  })
})

describe('countMissing', () => {
  it('统计有网价但未填现货的数量', () => {
    const sheet: PriceSheet = {
      id: 's1',
      name: 's',
      projectId: '',
      projectName: '',
      orderDate: '2026-09-09',
      refDate: '2026-09-10',
      refPeriod: '9:30 上午',
      lengthPremium: 30,
      status: '报价',
      rows: [],
      inputs: {},
    }
    expect(countMissing(data, sheet, [row12, row12m], brands)).toBe(2)
    expect(
      countMissing(
        data,
        { ...sheet, inputs: { '中天:r1': { spot: 3280 } } },
        [row12, row12m],
        brands,
      ),
    ).toBe(1)
  })
})

describe('syncSpotInputs', () => {
  it('相同 类别/材质/规格/长度 的行同步现货价', () => {
    const a = { ...row12, id: 'a' }
    const b = { ...row12, id: 'b' }
    const c = { ...row12, id: 'c', spec: 16 }
    const { inputs, targets } = syncSpotInputs([a, b, c], {}, '中天', 'a', 3300)
    expect(targets.map((row) => row.id).sort()).toEqual(['a', 'b'])
    expect(inputs['中天:a'].spot).toBe(3300)
    expect(inputs['中天:b'].spot).toBe(3300)
    expect(inputs['中天:c']).toBeUndefined()
  })

  it('未选择商品的空行不联动', () => {
    const a = makeRow()
    const b = makeRow()
    const { targets } = syncSpotInputs([a, b], {}, '中天', a.id, 100)
    expect(targets.map((row) => row.id)).toEqual([a.id])
  })

  /*
   * 代取来源与手工改价的关系（角标不能撒谎）：
   * 系统带出的价被人改写后来源就不成立了；只失焦、数值没变则来源必须留着
   * （否则用户点一下格子再离开，角标就没了）。
   */
  it('手工改写代取价后来源被显式清成 null', () => {
    const a = { ...row12, id: 'a' }
    const { inputs } = syncSpotInputs(
      [a],
      { '中天:a': { spot: 3420, spotSourceMaterial: 'HRB400E' } },
      '中天',
      'a',
      3500,
    )

    expect(inputs['中天:a'].spot).toBe(3500)
    expect(inputs['中天:a'].spotSourceMaterial).toBeNull()
  })

  it('数值未变(只失焦)时来源保留', () => {
    const a = { ...row12, id: 'a' }
    const { inputs } = syncSpotInputs(
      [a],
      { '中天:a': { spot: 3420, spotSourceMaterial: 'HRB400E' } },
      '中天',
      'a',
      3420,
    )

    expect(inputs['中天:a'].spotSourceMaterial).toBe('HRB400E')
  })
})

describe('reconcileSpotInputs', () => {
  it('同商品同品牌缺省行自动套用已有现货价', () => {
    const a = { ...row12, id: 'a' }
    const b = { ...row12, id: 'b' }
    const next = reconcileSpotInputs([a, b], { '中天:a': { spot: 3160 } }, [
      '中天',
      '铜陵富鑫',
    ])
    expect(next['中天:a'].spot).toBe(3160)
    expect(next['中天:b'].spot).toBe(3160)
    expect(next['铜陵富鑫:a']).toBeUndefined()
  })

  it('无变化时返回原对象', () => {
    const a = { ...row12, id: 'a' }
    const inputs = { '中天:a': { spot: 3160 } }
    expect(reconcileSpotInputs([a], inputs, ['中天'])).toBe(inputs)
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
    expect(patch['2026-09-11']['上午']['中天']['螺纹钢|HRB400E']['14']).toBe(
      3300,
    )
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
    expect(patch['2026-09-11']['上午']['万泰']['螺纹钢|HRB400E']['12']).toBe(
      3290,
    )
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
    expect(merged['2026-09-10']['上午']['中天']['螺纹钢|HRB400']['12']).toBe(
      3200,
    )
    expect(merged['2026-09-11']['上午']['万泰']['盘螺|HRB400']['8']).toBe(3500)
  })
})

describe('filterSupplierOptionsByBrand', () => {
  const options = [
    { value: 's1', label: '沙钢', brands: ['中天', '永钢'] },
    { value: 's2', label: '河钢', brands: ['沙钢'] },
    { value: 's3', label: '无品牌' },
  ]

  it('品牌有绑定供应商时只返回绑定项', () => {
    const result = filterSupplierOptionsByBrand(options, '中天')
    expect(result.map((option) => option.value)).toEqual(['s1'])
  })

  it('品牌无任何绑定供应商时回退返回全部', () => {
    const result = filterSupplierOptionsByBrand(options, '亚新')
    expect(result.map((option) => option.value)).toEqual(['s1', 's2', 's3'])
  })

  it('未选品牌时返回全部, 保持兼容', () => {
    expect(filterSupplierOptionsByBrand(options, undefined)).toBe(options)
    expect(filterSupplierOptionsByBrand(options, '')).toBe(options)
  })

  it('多品牌绑定时返回全部命中项', () => {
    const result = filterSupplierOptionsByBrand(options, '永钢')
    expect(result.map((option) => option.value)).toEqual(['s1'])
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

describe('fillSupplierInputs', () => {
  const rows: PriceRow[] = [
    { ...row12, id: 'r1' },
    { ...row12, id: 'r2' },
    {
      id: 'sep1',
      rowType: 'SEPARATOR',
      category: '',
      material: '',
      spec: null,
      length: '',
    },
    { ...row12, id: 'r3' },
  ]

  it('按目标行覆盖填入供应商标识, 不动已有现货价', () => {
    const inputs = { '中天:r1': { spot: 3180 } }
    const next = fillSupplierInputs(rows, inputs, '中天', ['r1', 'r2'], {
      value: 's2',
      label: '河钢',
    })
    expect(next['中天:r1']).toEqual({
      spot: 3180,
      supplierId: 's2',
      supplierName: '河钢',
    })
    expect(next['中天:r2']).toEqual({ supplierId: 's2', supplierName: '河钢' })
    // 未选中的行不处理
    expect(next['中天:r3']).toBeUndefined()
  })

  it('覆盖已有值为新供应商(支持换第 N 家重新报价)', () => {
    const inputs = {
      '中天:r1': { spot: 3180, supplierId: 's1', supplierName: '沙钢' },
    }
    const next = fillSupplierInputs(rows, inputs, '中天', ['r1'], {
      value: 's2',
      label: '河钢',
    })
    expect(next['中天:r1']?.supplierId).toBe('s2')
    expect(next['中天:r1']?.supplierName).toBe('河钢')
    expect(next['中天:r1']?.spot).toBe(3180)
  })

  it('忽略隔断行, 且无实际变化时返回原对象', () => {
    const inputs = { '中天:r1': { supplierId: 's2', supplierName: '河钢' } }
    // 隔断行虽在目标集合内, 但跳过 → 无变化
    const same = fillSupplierInputs(rows, inputs, '中天', ['sep1'], {
      value: 's9',
      label: '某钢',
    })
    expect(same).toBe(inputs)
    // 已相同的值不再写入
    const noop = fillSupplierInputs(rows, inputs, '中天', ['r1'], {
      value: 's2',
      label: '河钢',
    })
    expect(noop).toBe(inputs)
  })

  it('传入 undefined 等价清除简称, 保留现货价', () => {
    const inputs = {
      '中天:r1': { spot: 3180, supplierId: 's1', supplierName: '沙钢' },
      '中天:r2': { supplierId: 's1', supplierName: '沙钢' },
    }
    const next = fillSupplierInputs(
      rows,
      inputs,
      '中天',
      ['r1', 'r2'],
      undefined,
    )
    expect(next['中天:r1']).toEqual({ spot: 3180 })
    // 无其它字段则删除该输入
    expect('中天:r2' in next).toBe(false)
  })

  it('空目标行集合不产生变化', () => {
    const inputs = {}
    expect(
      fillSupplierInputs(rows, inputs, '中天', [], {
        value: 's1',
        label: '沙钢',
      }),
    ).toBe(inputs)
  })
})

describe('isPurchasedRow', () => {
  it('关联了采购订单的商品行视为已采购', () => {
    expect(isPurchasedRow({ ...row12, purchaseOrderId: 'po1' })).toBe(true)
  })

  it('未关联采购订单的商品行不是已采购', () => {
    expect(isPurchasedRow({ ...row12 })).toBe(false)
  })

  it('隔断行即使带采购订单也恒为未采购', () => {
    expect(
      isPurchasedRow({
        id: 'sep1',
        rowType: 'SEPARATOR',
        category: '',
        material: '',
        spec: null,
        length: '',
        purchaseOrderId: 'po1',
      }),
    ).toBe(false)
  })
})

describe('sumTonByPurchaseOrderItem', () => {
  it('按采购订单汇总商品行吨位, 忽略隔断行与未关联行', () => {
    const totals = sumTonByPurchaseOrderItem([
      { ...row12, id: 'r1', ton: 10, purchaseOrderItemId: 'po1' },
      { ...row12, id: 'r2', ton: 5.5, purchaseOrderItemId: 'po1' },
      { ...row12, id: 'r3', ton: 3, purchaseOrderItemId: 'po2' },
      { ...row12, id: 'r4', ton: 99 },
      {
        id: 'sep1',
        rowType: 'SEPARATOR',
        category: '',
        material: '',
        spec: null,
        length: '',
        ton: 7,
        purchaseOrderItemId: 'po1',
      },
    ])

    expect(totals.get('po1')).toBe(15.5)
    expect(totals.get('po2')).toBe(3)
    expect(totals.has('po3')).toBe(false)
  })

  it('忽略非正数与缺失吨位, 空输入返回空 Map', () => {
    const totals = sumTonByPurchaseOrderItem([
      { ...row12, id: 'r1', purchaseOrderItemId: 'po1' },
      { ...row12, id: 'r2', ton: 0, purchaseOrderItemId: 'po1' },
      { ...row12, id: 'r3', ton: -1, purchaseOrderItemId: 'po1' },
    ])
    expect(totals.has('po1')).toBe(false)
    expect(sumTonByPurchaseOrderItem([]).size).toBe(0)
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
  })
})

describe('findAlternateLengthVariety 长度互切', () => {
  const pool: Variety[] = [
    {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
      label: 'a',
    },
    {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
      label: 'b',
    },
    {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 25,
      length: '9米',
      label: 'c',
    },
    { category: '盘螺', material: 'HRB400E', spec: 8, length: '-', label: 'd' },
  ]

  it('9米切到同规格的12米', () => {
    const result = findAlternateLengthVariety(pool, {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
    })
    expect(result?.length).toBe('12米')
    expect(result?.spec).toBe(12)
  })

  it('12米切回同规格的9米', () => {
    const result = findAlternateLengthVariety(pool, {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
    })
    expect(result?.length).toBe('9米')
  })

  it('同规格只有一种长度时不返回(Φ25 仅 9米)', () => {
    expect(
      findAlternateLengthVariety(pool, {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 25,
        length: '9米',
      }),
    ).toBeUndefined()
  })

  it('盘螺(长度 -)不参与切换', () => {
    expect(
      findAlternateLengthVariety(pool, {
        category: '盘螺',
        material: 'HRB400E',
        spec: 8,
        length: '-',
      }),
    ).toBeUndefined()
  })

  it('规格为空时不返回', () => {
    expect(
      findAlternateLengthVariety(pool, {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: null,
        length: '9米',
      }),
    ).toBeUndefined()
  })
})

describe('applyRowLock 行级锁定', () => {
  it('锁定保留关联', () => {
    const row: PriceRow = {
      ...row12,
      id: 'r1',
      purchaseOrderId: '88',
      purchaseOrderItemId: '301',
      purchaseOrderNo: 'PO-88',
    }
    const next = applyRowLock(row, true)
    expect(next.locked).toBe(true)
    expect(next.purchaseOrderId).toBe('88')
    expect(next.purchaseOrderItemId).toBe('301')
  })

  it('解锁清除采购订单关联与快照', () => {
    const row: PriceRow = {
      ...row12,
      id: 'r1',
      locked: true,
      purchaseOrderId: '88',
      purchaseOrderItemId: '301',
      purchaseOrderNo: 'PO-88',
    }
    const next = applyRowLock(row, false)
    expect(next.locked).toBe(false)
    expect(next.purchaseOrderId).toBeUndefined()
    expect(next.purchaseOrderItemId).toBeUndefined()
    expect(next.purchaseOrderNo).toBeUndefined()
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
  it('基准字号(14px)下: 等比列取基准值, 吨位两列取内容下界', () => {
    expect(scaleSheetColumnWidth(SHEET_COLUMN_WIDTH.spec, 14)).toBe(
      SHEET_COLUMN_WIDTH.spec,
    )
    const widths = sheetColumnWidths(14)
    expect(widths.spec).toBe(SHEET_COLUMN_WIDTH.spec)
    expect(widths.ton).toBe(SHEET_COLUMN_WIDTH.ton)
    // 已开/未开两列不随字号缩放: 无内容时取数字下界(13/45 + 51 + 2)
    expect(widths.issuedTon).toBe(66)
    expect(widths.unopenedTon).toBe(98)
  })

  it('字号 16/18 等比放大(吨位两列按内容, 不随字号变宽)', () => {
    for (const fontSize of [16, 18]) {
      const widths = sheetColumnWidths(fontSize)
      // 「材质 / 规格 / 长度」列放不下时会截断, 必须有足够增量
      expect(widths.spec).toBe(
        Math.round((SHEET_COLUMN_WIDTH.spec * fontSize) / 14),
      )
      expect(widths.supplier).toBeGreaterThan(SHEET_COLUMN_WIDTH.supplier)
      // 逐键校验: 吨位两列是固定 11px 内容, 其余列按同一比例放大
      for (const [key, base] of Object.entries(SHEET_COLUMN_WIDTH)) {
        const width = widths[key as keyof typeof SHEET_COLUMN_WIDTH]
        if (key === 'issuedTon' || key === 'unopenedTon') {
          expect(width).toBe(sheetColumnWidths(14)[key])
        } else {
          expect(width).toBe(Math.round((base * fontSize) / 14))
        }
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
   * 吨位三列的宽度契约。
   *
   * 「报单吨位」列只放 4.75em 输入框 + 单元格留白(左右各约 6.5px): 84 足够, 且不随内容变化;
   * 「已开吨位」列放三位小数(最长 `8,884.500`), 基准字号 92 足够;
   * 「未开吨位」列放数字 + 品牌 + 明细图标, 数字固定 11px(不随个人字号缩放),
   * 因此列宽取"基准字号等比换算"与 {@link requiredTonColumnWidth}(固定开销 + 数字下界/实际内容宽)
   * 的较大值 —— 长品牌名否则会被省略号收尾。
   *
   * 固定开销 45px = 单元格左右留白(13) + 数字与明细图标之间的两个 flex gap(8) + 明细图标(24,
   * 由 24×24 命中区下限决定), 三者都不随字号缩放: 小字号档(11/12/13)等比压小列宽时要靠这个
   * 下界兜住, 线上实测 12px 档 + 面板窄于表格总宽时数字曾被截成省略号。
   */
  /** 未开吨位列实际可用的内容宽(px)。 */
  const unopenedAvailableWidth = (fontSize: number) =>
    sheetColumnWidths(fontSize).unopenedTon - TON_CELL_FIXED_CHROME

  it('六档字号下未开吨位数字都完整可读(列宽按内容, 与字号无关)', () => {
    for (const fontSize of [11, 12, 13, 14, 16, 18]) {
      expect(unopenedAvailableWidth(fontSize)).toBeGreaterThanOrEqual(
        TON_PROGRESS_MIN_TEXT_WIDTH,
      )
    }
    // 无内容时列宽 = 固定开销 45 + 数字下界 51 + 余量 2 ⇒ 可用宽 53px
    expect(unopenedAvailableWidth(SHEET_WIDTH_BASE_FONT_SIZE)).toBe(
      TON_PROGRESS_MIN_TEXT_WIDTH + 2,
    )
  })

  it('三列宽度: 报单输入 / 已开数字 / 未开数字+品牌', () => {
    expect(SHEET_COLUMN_WIDTH.ton).toBe(84)
    expect(SHEET_COLUMN_WIDTH.issuedTon).toBe(92)
    expect(SHEET_COLUMN_WIDTH.unopenedTon).toBe(184)
    // 报单吨位列必须容得下 4.75em 输入框(基准字号约 66.5px)与单元格留白
    expect(SHEET_COLUMN_WIDTH.ton).toBeGreaterThan(TON_INPUT_WIDTH_EM * 14 + 13)
    // 已开吨位列必须容得下最长形 `8,884.500`
    expect(SHEET_COLUMN_WIDTH.issuedTon).toBeGreaterThan(
      estimateSheetTextWidth('8,884.500', 14) + 13,
    )
    expect(TON_PROGRESS_MIN_TEXT_WIDTH).toBe(51)
    expect(TON_CELL_FIXED_CHROME).toBe(45)
    expect(TON_INPUT_WIDTH_EM).toBe(4.75)
  })

  it('吨位三列: 报单输入按字号缩放, 已开/未开按内容', () => {
    expect(requiredTonColumnWidth()).toBe(98)
    expect(requiredIssuedTonColumnWidth()).toBe(66)
    for (const fontSize of [11, 12, 13, 14, 16, 18]) {
      // 报单吨位列放的是随字号缩放的输入框
      expect(sheetColumnWidths(fontSize).ton).toBe(
        scaleSheetColumnWidth(SHEET_COLUMN_WIDTH.ton, fontSize),
      )
      // 已开/未开两列内容固定 11px: 不随字号变化
      expect(sheetColumnWidths(fontSize).issuedTon).toBe(
        requiredIssuedTonColumnWidth(),
      )
      expect(sheetColumnWidths(fontSize).unopenedTon).toBe(
        requiredTonColumnWidth(),
      )
    }
  })

  /*
   * 未开吨位文案按**单据实际内容**定宽: 「115.5 · 中天」比「10」宽, 长品牌名更宽, 只按字号
   * 换算推不出来。宽度来自 estimateSheetTextWidth 的分字符系数(汉字 1em / 数字 0.6em,
   * 与真机实测同口径), 这里锁定它的量级与保守性。
   */
  it('文本宽度估算: 汉字 1em、数字 0.6em, 且不小于真机实测值', () => {
    // 真机实测(PingFang SC 11px, tabular-nums): 旧口径「已开 0/26」= 50.97px
    expect(estimateSheetTextWidth('已开 0/26', 11)).toBeGreaterThanOrEqual(51)
    // 汉字恒为 1em: 4 个汉字在 11px 下不少于 44px
    expect(estimateSheetTextWidth('中天钢铁', 11)).toBeGreaterThanOrEqual(44)
    // 估算必须单调: 更长/更大的文本不会算出更窄的宽度
    expect(estimateSheetTextWidth('115.5', 11)).toBeGreaterThan(
      estimateSheetTextWidth('10', 11),
    )
    expect(estimateSheetTextWidth('10', 22)).toBeGreaterThan(
      estimateSheetTextWidth('10', 11),
    )
    // 千分位分隔符也要计入, 不能算窄
    expect(estimateSheetTextWidth('1,234.5', 11)).toBeGreaterThan(
      estimateSheetTextWidth('1234.5', 11),
    )
    // 负号(已开超订货)同样要占宽
    expect(estimateSheetTextWidth('-20', 11)).toBeGreaterThan(
      estimateSheetTextWidth('20', 11),
    )
    expect(estimateSheetTextWidth('', 11)).toBe(0)
  })

  it('整行宽度 = 数字 + gap + 分隔符(含 margin) + 品牌', () => {
    const numberOnly = tonProgressLineWidth('115.5', '')
    expect(numberOnly).toBe(estimateSheetTextWidth('115.5', 11))
    const withBrand = tonProgressLineWidth('115.5', '中天')
    expect(withBrand).toBeGreaterThan(numberOnly)
    // 品牌越长整行越宽
    expect(tonProgressLineWidth('115.5', '中天钢铁')).toBeGreaterThan(withBrand)
  })

  it('传入实际内容宽后未开吨位列随之定宽, 且不低于数字下界', () => {
    const numberOnly = requiredTonColumnWidth()
    const withBrand = requiredTonColumnWidth(
      tonProgressLineWidth('115.5', '中天钢铁'),
    )
    // 内容更宽 ⇒ 列更宽, 且差值等于多出来的文本宽
    expect(withBrand - numberOnly).toBe(
      tonProgressLineWidth('115.5', '中天钢铁') - TON_PROGRESS_MIN_TEXT_WIDTH,
    )
    const brandWidth = tonProgressLineWidth('115.5', '中天')
    // 列宽完全按内容: 「115.5 · 中天」需要多宽就给多宽
    expect(sheetColumnWidths(14, { unopened: brandWidth }).unopenedTon).toBe(
      requiredTonColumnWidth(brandWidth),
    )
    // 内容很短时回落到数字下界, 不为固定基准白留空白
    expect(sheetColumnWidths(14, { unopened: 10 }).unopenedTon).toBe(numberOnly)
    // 其余列与内容无关
    expect(sheetColumnWidths(14, { unopened: 200 }).spec).toBe(
      SHEET_COLUMN_WIDTH.spec,
    )
  })

  it('内容宽超过上限时列宽不再膨胀(品牌是自由文本, 防止把表格撑爆)', () => {
    const capped = requiredTonColumnWidth(TON_PROGRESS_TEXT_MAX_WIDTH)
    expect(requiredTonColumnWidth(10_000)).toBe(capped)
    // 上限本身仍明显宽于数字下界, 否则等于把"完整显示"又退回去
    expect(capped).toBeGreaterThan(requiredTonColumnWidth())
    expect(TON_PROGRESS_TEXT_MAX_WIDTH).toBe(220)
  })

  it('长吨位/长品牌在任何字号下都不会被裁(列宽只跟内容走)', () => {
    const progressWidth = tonProgressLineWidth('8,884.5', '中天钢铁')
    for (const fontSize of [11, 12, 13, 14, 16, 18]) {
      const widths = sheetColumnWidths(fontSize, { unopened: progressWidth })
      expect(widths.unopenedTon).toBe(requiredTonColumnWidth(progressWidth))
      expect(widths.unopenedTon - TON_CELL_FIXED_CHROME).toBeGreaterThanOrEqual(
        progressWidth,
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
