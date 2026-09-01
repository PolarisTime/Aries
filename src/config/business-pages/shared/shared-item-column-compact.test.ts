import { describe, expect, it } from 'vitest'
import {
  compactPurchaseItemColumns,
  compactSalesOrderItemColumns,
} from './shared-item-column-compact'

describe('compactSalesOrderItemColumns', () => {
  it('销售订单隐藏商品编码和批号，并将仓库名称放在品牌前', () => {
    const dataIndexes = compactSalesOrderItemColumns.map(
      (column) => column.dataIndex,
    )

    expect(dataIndexes).toEqual([
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
    expect(dataIndexes).not.toContain('materialCode')
    expect(dataIndexes).not.toContain('batchNo')
  })

  it('不改变采购订单的共享明细列顺序', () => {
    expect(
      compactPurchaseItemColumns.map((column) => column.dataIndex),
    ).toEqual([
      'materialCode',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'warehouseName',
      'batchNo',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })
})
