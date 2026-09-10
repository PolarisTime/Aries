import { describe, expect, it } from 'vitest'
import {
  buildGridRows,
  computeSummary,
  countMissing,
  makeRow,
  moveItem,
  netPrice,
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
    orderDate: '2026-09-09',
    refDate: '2026-09-10',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    locked: false,
    status: '报价',
    rows: [],
    inputs,
  })

  it('差值乘吨数, 差价 = 网价 − 现货 − 运费', () => {
    const summary = computeSummary(
      data,
      sheet({ '_:r1': { ton: 10 }, '中天:r1': { spot: 3280 } }),
      [row12],
      brands,
    )
    expect(summary.totalTon).toBe(10)
    expect(summary.filled).toBe(1)
  })

  it('缺现货或吨数时不计入已填数', () => {
    expect(
      computeSummary(
        data,
        sheet({ '中天:r1': { spot: 3280 } }),
        [row12],
        brands,
      ).filled,
    ).toBe(0)
    expect(
      computeSummary(data, sheet({ '_:r1': { ton: 10 } }), [row12], brands)
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

describe('countMissing', () => {
  it('统计有网价但未填现货的数量', () => {
    const sheet: PriceSheet = {
      id: 's1',
      name: 's',
      projectId: '',
      orderDate: '2026-09-09',
      refDate: '2026-09-10',
      refPeriod: '9:30 上午',
      lengthPremium: 30,
      locked: false,
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

describe('moveItem', () => {
  it('按位置移动元素, 越界或同位置时原样返回', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('buildGridRows / makeRow', () => {
  it('按类别分组, 组行不携带数据', () => {
    const rows = buildGridRows([
      row12,
      { ...row12, id: 'r3', category: '盘螺', spec: 6, length: '-' },
    ])
    expect(rows.map((row) => row.category)).toEqual(['螺纹钢', '盘螺'])
    expect(rows[0].isGroup).toBe(true)
    expect(rows[0].children?.[0].row?.id).toBe('r1')
  })

  it('makeRow 使用类别的默认规格与长度', () => {
    expect(makeRow('盘螺').spec).toBe(6)
    expect(makeRow('盘螺').length).toBe('-')
    expect(makeRow('螺纹钢').length).toBe('9米')
  })
})
