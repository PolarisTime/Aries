import { describe, expect, it } from 'vitest'
import { groupFreightBillItems } from './freight-statement-item-groups'

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
