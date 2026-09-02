import { describe, expect, it } from 'vitest'
import { mergeColumnOrder, toggleColumnVisibility } from './table-columns'

describe('mergeColumnOrder', () => {
  it('历史顺序保留，新增公共字段追加到末尾', () => {
    const allIds = [
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
    ]
    const savedOrder = ['brand', 'spec', 'material', 'weightTon', 'amount']

    expect(mergeColumnOrder(allIds, savedOrder)).toEqual([
      'brand',
      'spec',
      'material',
      'weightTon',
      'amount',
      'category',
      'length',
      'unit',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'unitPrice',
    ])
  })

  it('filterInvalid 时过滤已不存在的历史字段', () => {
    const allIds = ['brand', 'category', 'amount']
    const savedOrder = [
      'brand',
      'materialCode',
      'category',
      'batchNo',
      'amount',
    ]

    expect(
      mergeColumnOrder(allIds, savedOrder, { filterInvalid: true }),
    ).toEqual(['brand', 'category', 'amount'])
  })

  it('新字段在历史隐藏字段恢复时仍追加到末尾', () => {
    const allIds = ['warehouseName', 'brand', 'category', 'amount', 'weightTon']
    const savedOrder = ['warehouseName', 'brand', 'amount']

    expect(mergeColumnOrder(allIds, savedOrder)).toEqual([
      'warehouseName',
      'brand',
      'amount',
      'category',
      'weightTon',
    ])
  })

  it('尾部固定列始终保持在最后', () => {
    const allIds = ['brand', 'category', 'amount', 'action']
    const savedOrder = ['action', 'brand', 'amount']

    expect(mergeColumnOrder(allIds, savedOrder, { tailId: 'action' })).toEqual([
      'brand',
      'amount',
      'category',
      'action',
    ])
  })

  it('头部固定列始终保持在最前，即使历史顺序已将其排在其他位置', () => {
    const allIds = ['detail-toggle', 'brand', 'category', 'amount', 'action']
    const savedOrder = ['brand', 'detail-toggle', 'amount']

    expect(
      mergeColumnOrder(allIds, savedOrder, {
        headId: 'detail-toggle',
        tailId: 'action',
      }),
    ).toEqual(['detail-toggle', 'brand', 'amount', 'category', 'action'])
  })

  it('头部固定列不在保存顺序中时，从默认列追加后仍置于最前', () => {
    const allIds = ['brand', 'detail-toggle', 'category', 'amount']
    const savedOrder = ['brand', 'amount']

    expect(
      mergeColumnOrder(allIds, savedOrder, { headId: 'detail-toggle' }),
    ).toEqual(['detail-toggle', 'brand', 'amount', 'category'])
  })

  it('保存顺序为空时输出全部默认列', () => {
    const allIds = ['brand', 'category', 'amount']

    expect(mergeColumnOrder(allIds, [])).toEqual([
      'brand',
      'category',
      'amount',
    ])
  })
})

describe('toggleColumnVisibility', () => {
  it('隐藏过的列恢复默认显示', () => {
    expect(toggleColumnVisibility({ brand: false }, 'brand')).toEqual({})
  })

  it('可见列标记为隐藏', () => {
    expect(toggleColumnVisibility({}, 'brand')).toEqual({ brand: false })
  })
})
