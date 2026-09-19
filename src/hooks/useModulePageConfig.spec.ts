import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import {
  buildAmountRestrictedViewConfig,
  filterAmountItemColumns,
} from './useModulePageConfig'

const base = {
  key: 'sales-order',
  columns: [{ dataIndex: 'totalAmount' }, { dataIndex: 'orderNo' }],
  detailFields: [{ key: 'totalAmount' }, { key: 'orderNo' }],
  formFields: [{ key: 'totalAmount' }, { key: 'orderNo' }],
  itemColumns: [
    { dataIndex: 'unitPrice' },
    { dataIndex: 'amount' },
    { dataIndex: 'quantity' },
  ],
  detailItemColumns: [{ dataIndex: 'unitPrice' }, { dataIndex: 'quantity' }],
  saveResultItemColumns: [{ dataIndex: 'amount' }],
} as unknown as ModulePageConfig

describe('filterAmountItemColumns', () => {
  it('移除单价与金额列', () => {
    expect(
      filterAmountItemColumns([
        { dataIndex: 'unitPrice' },
        { dataIndex: 'amount' },
        { dataIndex: 'quantity' },
      ] as never)?.map((column) => column.dataIndex),
    ).toEqual(['quantity'])
  })

  it('入参为空时原样返回', () => {
    expect(filterAmountItemColumns(undefined)).toBeUndefined()
  })
})

describe('buildAmountRestrictedViewConfig', () => {
  it('同时移除表头/明细的金额与单价列、字段', () => {
    const result = buildAmountRestrictedViewConfig(base)

    expect(result.columns.map((column) => column.dataIndex)).toEqual([
      'orderNo',
    ])
    expect(result.detailFields.map((field) => field.key)).toEqual(['orderNo'])
    expect(result.formFields?.map((field) => field.key)).toEqual(['orderNo'])
    expect(result.itemColumns?.map((column) => column.dataIndex)).toEqual([
      'quantity',
    ])
    expect(result.detailItemColumns?.map((column) => column.dataIndex)).toEqual(
      ['quantity'],
    )
    expect(result.saveResultItemColumns).toEqual([])
  })

  it('不修改原 config（返回新对象）', () => {
    const result = buildAmountRestrictedViewConfig(base)

    expect(result).not.toBe(base)
    expect(base.columns).toHaveLength(2)
  })
})
