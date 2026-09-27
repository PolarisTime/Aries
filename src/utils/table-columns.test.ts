import { describe, expect, it } from 'vitest'
import {
  mergeColumnOrder,
  moveColumnKey,
  toggleColumnVisibility,
} from './table-columns'

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

describe('moveColumnKey', () => {
  it('移到最前: 其余列相对顺序保持不变', () => {
    expect(moveColumnKey(['a', 'b', 'c', 'd'], 'c', 'first')).toEqual([
      'c',
      'a',
      'b',
      'd',
    ])
  })

  it('移到最后: 其余列相对顺序保持不变', () => {
    expect(moveColumnKey(['a', 'b', 'c', 'd'], 'b', 'last')).toEqual([
      'a',
      'c',
      'd',
      'b',
    ])
  })

  it('已经在目标位置时返回原数组引用(不触发无意义的重排与持久化)', () => {
    const order = ['a', 'b', 'c']
    expect(moveColumnKey(order, 'a', 'first')).toBe(order)
    expect(moveColumnKey(order, 'c', 'last')).toBe(order)
  })

  it('列不存在时原样返回, 不改动顺序', () => {
    const order = ['a', 'b']
    expect(moveColumnKey(order, 'missing', 'first')).toBe(order)
  })

  it('单列数组两个方向都保持自身', () => {
    const order = ['only']
    expect(moveColumnKey(order, 'only', 'first')).toBe(order)
    expect(moveColumnKey(order, 'only', 'last')).toBe(order)
  })
})

describe('moveColumnKey 基于可见列计算插入点', () => {
  it('隐藏列夹在末尾时, 移到「最后」落在最后一个可见列之后', () => {
    // remark 是默认隐藏列, 完整顺序里排在最后
    const order = ['no', 'supplier', 'remark']
    expect(
      moveColumnKey(order, 'supplier', 'last', ['no', 'supplier']),
    ).toEqual(['no', 'supplier', 'remark'])
    // supplier 已经在最后一个可见位置 → 顺序不变(返回原引用)
    expect(moveColumnKey(order, 'supplier', 'last', ['no', 'supplier'])).toBe(
      order,
    )
  })

  it('隐藏列夹在开头时, 移到「最前」落在第一个可见列之前', () => {
    const order = ['remark', 'no', 'supplier']
    expect(
      moveColumnKey(order, 'supplier', 'first', ['no', 'supplier']),
    ).toEqual(['remark', 'supplier', 'no'])
  })

  it('可见列只有一列时不做任何移动', () => {
    const order = ['no', 'remark']
    expect(moveColumnKey(order, 'no', 'last', ['no'])).toBe(order)
    expect(moveColumnKey(order, 'no', 'first', ['no'])).toBe(order)
  })

  it('中间可见列移到「最后」后, 可见投影里它排在最后且不丢列', () => {
    const order = ['a', 'b', 'hidden', 'c']
    const visible = ['a', 'b', 'c']
    const next = moveColumnKey(order, 'a', 'last', visible)
    expect(next.filter((key) => visible.includes(key))).toEqual(['b', 'c', 'a'])
    expect([...next].sort()).toEqual([...order].sort())
  })
})
