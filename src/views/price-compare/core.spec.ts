import { describe, expect, it } from 'vitest'
import {
  canonicalCategory,
  computeSummary,
  countMissing,
  dataKeyOf,
  fillSupplierInputs,
  filterSupplierOptionsByBrand,
  isSeparatorRow,
  makeRow,
  makeSeparatorRow,
  matchesToData,
  mergePriceData,
  moveItem,
  netPrice,
  netPriceWithFallback,
  reconcileSpotInputs,
  syncSpotInputs,
} from './core'
import type { Brand, PriceData, PriceRow, PriceSheet } from './types'

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
