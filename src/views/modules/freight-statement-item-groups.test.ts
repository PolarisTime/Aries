import { describe, expect, it } from 'vitest'
import {
  groupFreightBillItems,
  groupFreightStatementItems,
  sortFreightStatementItems,
} from './freight-statement-item-groups'

describe('groupFreightBillItems', () => {
  it('按客户和项目分组并计算数量、重量汇总', () => {
    const groups = groupFreightBillItems([
      {
        id: '1',
        customerName: '客户甲',
        projectName: '项目一',
        quantity: 2,
        weightTon: 1.1,
      },
      {
        id: '2',
        customerName: '客户甲',
        projectName: '项目二',
        quantity: 3,
        weightTon: 2,
      },
      {
        id: '3',
        customerName: '客户甲',
        projectName: '项目一',
        quantity: 4,
        weightTon: 3.3,
      },
    ])

    expect(groups.map((group) => group.projectName)).toEqual([
      '项目一',
      '项目二',
    ])
    expect(groups[0]?.customerName).toBe('客户甲')
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['1', '3'])
    expect(groups[0]?.totalQuantity).toBe(6)
    expect(groups[0]?.totalWeightTon).toBe(4.4)
  })

  it('不同客户的同名项目保持独立分组', () => {
    const groups = groupFreightBillItems([
      { id: '1', customerName: '客户甲', projectName: '项目一' },
      { id: '2', customerName: '客户乙', projectName: '项目一' },
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.customerName)).toEqual([
      '客户甲',
      '客户乙',
    ])
  })

  it('空明细返回空分组', () => {
    expect(groupFreightBillItems([])).toEqual([])
  })
})

describe('sortFreightStatementItems', () => {
  const items = [
    {
      id: '1',
      sourceNo: '340845280926638080',
      sourceFreightBillTime: '2026-07-29',
    },
    {
      id: '2',
      sourceNo: '338315174437986304',
      sourceFreightBillTime: '2026-07-21',
    },
    {
      id: '3',
      sourceNo: '340845280926638080',
      sourceFreightBillTime: '2026-07-29',
    },
    {
      id: '4',
      sourceNo: '339030568157061120',
      _parentBillTime: '2026-07-24',
    },
    { id: '5', sourceNo: '' },
  ]

  it('按单号数值升序并保持同一物流单内的明细顺序', () => {
    const sorted = sortFreightStatementItems(items, 'sourceNo')

    expect(sorted.map((item) => item.id)).toEqual(['2', '4', '1', '3', '5'])
  })

  it('按来源物流单日期升序并将缺失日期的明细置后', () => {
    const sorted = sortFreightStatementItems(items, 'billTime')

    expect(sorted.map((item) => item.id)).toEqual(['2', '4', '1', '3', '5'])
  })

  it('按来源物流单日期降序并将缺失日期的明细置后', () => {
    const sorted = sortFreightStatementItems(items, 'billTime', 'desc')

    expect(sorted.map((item) => item.id)).toEqual(['1', '3', '4', '2', '5'])
  })
})

describe('groupFreightStatementItems', () => {
  it('保留来源物流单的单据日期供分组头展示', () => {
    const [group] = groupFreightStatementItems([
      {
        id: 'item-1',
        sourceFreightBillId: 'bill-1',
        sourceNo: 'WL-001',
        sourceFreightBillTime: '2026-08-01',
      },
    ])

    expect(group?.billTime).toBe('2026-08-01')
  })
})
