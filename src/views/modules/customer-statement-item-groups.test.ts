import { describe, expect, it } from 'vitest'
import { groupCustomerStatementItems } from './customer-statement-item-groups'

describe('groupCustomerStatementItems', () => {
  it('按销售订单号聚合并保留首次出现顺序', () => {
    const groups = groupCustomerStatementItems([
      { id: '1', sourceNo: 'SO-002', deliveryDate: '2026-08-02' },
      { id: '2', sourceNo: 'SO-001', deliveryDate: '2026-08-01' },
      { id: '3', sourceNo: 'SO-002', deliveryDate: '2026-08-02' },
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.groupNo)).toEqual([1, 2])
    expect(groups.map((group) => group.sourceNo)).toEqual(['SO-002', 'SO-001'])
    expect(groups[0]?.deliveryDate).toBe('2026-08-02')
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['1', '3'])
  })

  it('缺少销售订单号时使用来源销售订单明细ID隔离分组', () => {
    const groups = groupCustomerStatementItems([
      { id: '1', sourceSalesOrderItemId: '101' },
      { id: '2', sourceSalesOrderItemId: '101' },
      { id: '3', sourceSalesOrderItemId: '202' },
    ])

    expect(groups.map((group) => group.key)).toEqual([
      'source-item-id:101',
      'source-item-id:202',
    ])
  })

  it('没有可用来源时归入同一个未分组', () => {
    const groups = groupCustomerStatementItems([{ id: '1' }, { id: '2' }])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('unassigned')
    expect(groups[0]?.sourceNo).toBe('')
  })

  it('空明细返回空分组', () => {
    expect(groupCustomerStatementItems([])).toEqual([])
  })
})
