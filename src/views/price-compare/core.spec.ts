import { describe, expect, it } from 'vitest'
import {
  computeSummary,
  countMissing,
  makeRow,
  mergePriceData,
  moveItem,
  netPrice,
  quotesToData,
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
  groupId: 'g1',
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
    groups: [],
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
      groupId: 'g1',
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      length: '12米',
    }
    const rowRound12: PriceRow = {
      id: 'y',
      groupId: 'g1',
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
      groups: [],
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
    const a = makeRow('g1')
    const b = makeRow('g1')
    const { targets } = syncSpotInputs([a, b], {}, '中天', a.id, 100)
    expect(targets.map((row) => row.id)).toEqual([a.id])
  })
})

describe('quotesToData / mergePriceData', () => {
  it('按 日期/时段/品牌/品类|材质/规格 归并网价', () => {
    const patch = quotesToData([
      {
        quoteDate: '2026-09-11',
        period: '上午',
        breed: '螺纹钢',
        material: 'HRB400',
        spec: '12',
        factory: '中天',
        price: 3320,
      },
      {
        quoteDate: '2026-09-11',
        period: '上午',
        breed: '螺纹钢',
        material: 'HRB400',
        spec: '12',
        factory: '中天',
        price: '3330',
      },
    ])
    expect(patch['2026-09-11']['上午']['中天']['螺纹钢|HRB400']['12']).toBe(
      3330,
    )
  })

  it('深合并保留既有日期数据', () => {
    const base = {
      '2026-09-10': { 上午: { 中天: { '螺纹钢|HRB400': { '12': 3200 } } } },
    }
    const patch = quotesToData([
      {
        quoteDate: '2026-09-11',
        period: '上午',
        breed: '盘螺',
        material: 'HRB400',
        spec: '8',
        factory: '万泰',
        price: 3500,
      },
    ])
    const merged = mergePriceData(base, patch)
    expect(merged['2026-09-10']['上午']['中天']['螺纹钢|HRB400']['12']).toBe(
      3200,
    )
    expect(merged['2026-09-11']['上午']['万泰']['盘螺|HRB400']['8']).toBe(3500)
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
  it('makeRow 生成指定分组下的空行', () => {
    const row = makeRow('g1')
    expect(row.groupId).toBe('g1')
    expect(row.category).toBe('')
    expect(row.material).toBe('')
    expect(row.spec).toBeNull()
    expect(row.length).toBe('')
  })
})
