import { describe, expect, it } from 'vitest'
import {
  groupCustomerStatementItems,
  sortCustomerStatementItemsByDeliveryDate,
} from './customer-statement-item-groups'

describe('groupCustomerStatementItems', () => {
  it('按交货日期升序排序并计算分组汇总', () => {
    const groups = groupCustomerStatementItems([
      {
        id: '1',
        sourceNo: 'SO-002',
        deliveryDate: '2026-08-02',
        quantity: 2,
        weightTon: 1.1,
        amount: 20,
      },
      {
        id: '2',
        sourceNo: 'SO-001',
        deliveryDate: '2026-08-01',
        quantity: 3,
        weightTon: 2,
        amount: 30,
      },
      {
        id: '3',
        sourceNo: 'SO-002',
        deliveryDate: '2026-08-02',
        quantity: 4,
        weightTon: 3.3,
        amount: 40,
      },
      {
        id: '4',
        sourceNo: 'SO-003',
        deliveryDate: '',
        quantity: 1,
        weightTon: 0.5,
        amount: 10,
      },
    ])

    expect(groups.map((group) => group.groupNo)).toEqual([1, 2, 3])
    expect(groups.map((group) => group.sourceNo)).toEqual([
      'SO-001',
      'SO-002',
      'SO-003',
    ])
    expect(groups[1]?.deliveryDate).toBe('2026-08-02')
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['1', '3'])
    expect(groups[0]?.totalQuantity).toBe(3)
    expect(groups[0]?.totalWeightTon).toBe(2)
    expect(groups[0]?.totalAmount).toBe(30)
    expect(groups[1]?.totalQuantity).toBe(6)
    expect(groups[1]?.totalWeightTon).toBe(4.4)
    expect(groups[1]?.totalAmount).toBe(60)
  })

  it('交货日期相同时保持销售单首次出现顺序', () => {
    const groups = groupCustomerStatementItems([
      { id: '1', sourceNo: 'SO-002', deliveryDate: '2026-08-02' },
      { id: '2', sourceNo: 'SO-001', deliveryDate: '2026-08-02' },
    ])

    expect(groups.map((group) => group.sourceNo)).toEqual(['SO-002', 'SO-001'])
  })

  it('自动排序按交货日期升序且空日期置后', () => {
    const items = [
      { id: '1', deliveryDate: '2026-08-02' },
      { id: '2', deliveryDate: '2026-08-01' },
      { id: '3', deliveryDate: '' },
      { id: '4', deliveryDate: '2026-08-01' },
    ]

    expect(
      sortCustomerStatementItemsByDeliveryDate(items).map((item) => item.id),
    ).toEqual(['2', '4', '1', '3'])
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
