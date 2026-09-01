import { describe, expect, it } from 'vitest'
import { customerStatementPageConfig } from './customer-statement-page'
import { freightStatementPageConfig } from './freight-statement-page'

function dataIndexes(config: { itemColumns?: { dataIndex: string }[] }) {
  return (config.itemColumns ?? []).map((column) => column.dataIndex)
}

describe('客户对账单明细列', () => {
  const columns = customerStatementPageConfig.itemColumns ?? []

  it('默认列顺序与对账专用列一致', () => {
    expect(dataIndexes(customerStatementPageConfig)).toEqual([
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })

  it('金额与重量字段右对齐', () => {
    expect(columns.find((column) => column.dataIndex === 'amount')?.align).toBe(
      'right',
    )
    expect(
      columns.find((column) => column.dataIndex === 'weightTon')?.align,
    ).toBe('right')
    expect(
      columns.find((column) => column.dataIndex === 'unitPrice')?.align,
    ).toBe('right')
  })
})

describe('物流对账单明细列', () => {
  const columns = freightStatementPageConfig.itemColumns ?? []

  it('默认列顺序与对账单基线一致', () => {
    expect(dataIndexes(freightStatementPageConfig)).toEqual([
      'sourceNo',
      'warehouseName',
      'brand',
      'spec',
      'material',
      'category',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
    ])
  })

  it('出库单号列加宽以完整展示雪花 ID', () => {
    expect(
      columns.find((column) => column.dataIndex === 'sourceNo')?.width,
    ).toBe(180)
  })
})
