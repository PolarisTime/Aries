import { describe, expect, it } from 'vitest'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import {
  buildDefaultRowIds,
  buildPickupRows,
  buildPickupRowsByItem,
  changePickupRowQuantity,
  createPickupGroup,
  createWarehouseGroups,
  flattenGroupItemIds,
  groupDragId,
  groupIdFromDragId,
  isSplitValue,
  removePickupSplitPart,
  reorderGroupedItems,
  reorderGroups,
  resolveDraft,
  splitPickupItem,
} from './pickup-list-draft'

function buildItem(
  overrides: Partial<PurchaseOrderPickupListItem>,
): PurchaseOrderPickupListItem {
  return {
    itemId: '1',
    orderId: '1',
    orderNo: 'PO-1',
    lineNo: 1,
    warehouseId: null,
    warehouseName: null,
    brand: '品牌',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    pickupQuantity: 1,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.1,
    ...overrides,
  }
}

describe('pickup-list-draft 纯逻辑', () => {
  it('groupDragId 与 groupIdFromDragId 互逆，非分组 id 返回 undefined', () => {
    expect(groupIdFromDragId(groupDragId('g1'))).toBe('g1')
    expect(groupIdFromDragId('item-1')).toBeUndefined()
  })

  it('createPickupGroup 生成递增 id 且默认未锁定', () => {
    const first = createPickupGroup(['1'])
    const second = createPickupGroup()
    expect(first.id).not.toBe(second.id)
    expect(first.locked).toBe(false)
    expect(first.remark).toBe('')
    expect(first.itemIds).toEqual(['1'])
    expect(second.itemIds).toEqual([])
  })

  it('createWarehouseGroups 按仓库 id 分组并保持仓库内排序', () => {
    const groups = createWarehouseGroups([
      buildPickupRows(
        buildItem({ itemId: '2', warehouseId: 'w1' }),
        undefined,
      )[0],
      buildPickupRows(
        buildItem({ itemId: '1', warehouseId: 'w1' }),
        undefined,
      )[0],
      buildPickupRows(
        buildItem({ itemId: '3', warehouseId: 'w2' }),
        undefined,
      )[0],
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].itemIds).toEqual(['2', '1'])
    expect(groups[1].itemIds).toEqual(['3'])
  })

  it('createWarehouseGroups 无 id 时按仓库名分组，完全缺失时归入未指定组', () => {
    const groups = createWarehouseGroups([
      buildPickupRows(
        buildItem({ itemId: '1', warehouseName: '仓库A' }),
        undefined,
      )[0],
      buildPickupRows(buildItem({ itemId: '2' }), undefined)[0],
      buildPickupRows(
        buildItem({ itemId: '3', warehouseName: '仓库A' }),
        undefined,
      )[0],
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].itemIds).toEqual(['1', '3'])
    expect(groups[1].itemIds).toEqual(['2'])
  })

  it('createWarehouseGroups 空输入返回空数组', () => {
    expect(createWarehouseGroups([])).toEqual([])
  })

  it('resolveDraft 草稿为空或 dataKey 不匹配时回退默认单分组', () => {
    const draft = resolveDraft(null, 'key', [
      buildItem({ itemId: '1' }),
      buildItem({ itemId: '2' }),
    ])
    expect(draft.groups).toHaveLength(1)
    expect(draft.groups[0].itemIds).toEqual(['1', '2'])
    expect(draft.splits).toEqual({})

    const stale = resolveDraft(
      { dataKey: 'other', groups: [], splits: {} },
      'key',
      [buildItem({ itemId: '1' })],
    )
    expect(stale.dataKey).toBe('key')
    expect(stale.groups).toHaveLength(1)
  })

  it('resolveDraft 过滤无效与重复行，未分配项归入第一分组', () => {
    const items = [
      buildItem({ itemId: '1' }),
      buildItem({ itemId: '2' }),
      buildItem({ itemId: '3' }),
    ]
    const base = resolveDraft(null, 'key', items)
    const draft = resolveDraft(
      {
        dataKey: base.dataKey,
        splits: {},
        groups: [
          { id: 'a', locked: false, remark: '', itemIds: ['1', 'ghost', '2'] },
          { id: 'b', locked: false, remark: '', itemIds: ['2', '3'] },
        ],
      },
      'key',
      items,
    )
    expect(draft.groups[0].itemIds).toEqual(['1', '2'])
    expect(draft.groups[1].itemIds).toEqual(['3'])
  })

  it('resolveDraft 空 groups 回退默认分组', () => {
    const draft = resolveDraft(
      { dataKey: 'key', groups: [], splits: {} },
      'key',
      [buildItem({ itemId: '1' })],
    )
    expect(draft.groups).toHaveLength(1)
    expect(draft.groups[0].itemIds).toEqual(['1'])
  })

  it('resolveDraft 依当前拆分份展开默认行实例并追加新增份', () => {
    const item = buildItem({ itemId: '1', pickupQuantity: 8 })
    const base = resolveDraft(null, 'key', [item])
    const split = resolveDraft({ ...base, splits: { '1': [4, 4] } }, 'key', [
      item,
    ])
    expect(split.groups[0].itemIds).toEqual(['1', '1#1'])

    const grown = resolveDraft(
      {
        dataKey: 'key',
        splits: { '1': [3, 3, 2] },
        groups: [{ id: 'a', locked: false, remark: '', itemIds: ['1', '1#1'] }],
      },
      'key',
      [item],
    )
    expect(grown.groups[0].itemIds).toEqual(['1', '1#1', '1#2'])
  })

  it('resolveDraft 新增拆分份插到同来源同组行之后而非追加到组尾', () => {
    const items = [
      buildItem({ itemId: '1', pickupQuantity: 8 }),
      buildItem({ itemId: '2', pickupQuantity: 4 }),
    ]
    const grown = resolveDraft(
      {
        dataKey: 'key',
        splits: { '1': [4, 4] },
        groups: [{ id: 'a', locked: false, remark: '', itemIds: ['1', '2'] }],
      },
      'key',
      items,
    )
    expect(grown.groups[0].itemIds).toEqual(['1', '1#1', '2'])
  })

  it('flattenGroupItemIds 拼接所有分组明细', () => {
    expect(
      flattenGroupItemIds([
        { id: 'a', locked: false, remark: '', itemIds: ['1', '2'] },
        { id: 'b', locked: false, remark: '', itemIds: ['3'] },
      ]),
    ).toEqual(['1', '2', '3'])
  })

  it('reorderGroups 按分组 id 交换顺序，无效 id 不变', () => {
    const groups = [
      { id: 'a', locked: false, remark: '', itemIds: ['1'] },
      { id: 'b', locked: false, remark: '', itemIds: ['2'] },
    ]
    const moved = reorderGroups(groups, groupDragId('b'), groupDragId('a'))
    expect(moved.map((group) => group.id)).toEqual(['b', 'a'])
    expect(reorderGroups(groups, 'item-1', groupDragId('a'))).toBe(groups)
  })

  it('reorderGroupedItems 同组内移动', () => {
    const groups = [
      { id: 'a', locked: false, remark: '', itemIds: ['1', '2', '3'] },
    ]
    const moved = reorderGroupedItems(groups, '1', '3')
    expect(moved[0].itemIds).toEqual(['2', '3', '1'])
  })

  it('reorderGroupedItems 跨组移动被锁定分组阻断', () => {
    const groups = [
      { id: 'a', locked: true, remark: '', itemIds: ['1'] },
      { id: 'b', locked: false, remark: '', itemIds: ['2'] },
    ]
    expect(reorderGroupedItems(groups, '1', '2')).toBe(groups)
  })

  it('reorderGroupedItems 跨组移动插入目标分组', () => {
    const groups = [
      { id: 'a', locked: false, remark: '', itemIds: ['1'] },
      { id: 'b', locked: false, remark: '', itemIds: ['2', '3'] },
    ]
    const moved = reorderGroupedItems(groups, '1', '3')
    expect(moved[0].itemIds).toEqual([])
    expect(moved[1].itemIds).toEqual(['2', '1', '3'])
  })

  it('reorderGroupedItems 跨组移动到分组把手上时追加到末尾', () => {
    const groups = [
      { id: 'a', locked: false, remark: '', itemIds: ['1'] },
      { id: 'b', locked: false, remark: '', itemIds: ['2'] },
    ]
    const moved = reorderGroupedItems(groups, '1', groupDragId('b'))
    expect(moved[1].itemIds).toEqual(['2', '1'])
  })

  it('reorderGroupedItems 未知 id 返回原引用', () => {
    const groups = [{ id: 'a', locked: false, remark: '', itemIds: ['1'] }]
    expect(reorderGroupedItems(groups, 'ghost', '1')).toBe(groups)
    expect(reorderGroupedItems(groups, '1', 'ghost')).toBe(groups)
  })
})

describe('提货数量拆分', () => {
  it('buildPickupRows 未拆分时保持后端数量与重量', () => {
    const item = buildItem({
      itemId: '5',
      pickupQuantity: 8,
      pickupWeightTon: 1.234,
    })
    const rows = buildPickupRows(item, undefined)
    expect(rows).toHaveLength(1)
    expect(rows[0].rowId).toBe('5')
    expect(rows[0].quantity).toBe(8)
    expect(rows[0].weightTon).toBe(1.234)
    expect(rows[0].partCount).toBe(1)
  })

  it('buildPickupRows 拆分后件数守恒且重量按件重比例折算', () => {
    const item = buildItem({
      itemId: '5',
      pickupQuantity: 8,
      pickupWeightTon: 0.8,
    })
    const rows = buildPickupRows(item, [5, 3])
    expect(rows.map((row) => row.rowId)).toEqual(['5', '5#1'])
    expect(rows.map((row) => row.quantity)).toEqual([5, 3])
    expect(rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(8)
    expect(rows[0].weightTon).toBeCloseTo(0.5, 8)
    expect(rows[1].weightTon).toBeCloseTo(0.3, 8)
    expect(rows.reduce((sum, row) => sum + row.weightTon, 0)).toBeCloseTo(
      0.8,
      8,
    )
    expect(rows.map((row) => row.partIndex)).toEqual([0, 1])
  })

  it('buildPickupRowsByItem / buildDefaultRowIds 展开全部拆分份', () => {
    const items = [
      buildItem({ itemId: '1', pickupQuantity: 4 }),
      buildItem({ itemId: '2', pickupQuantity: 8 }),
    ]
    const splits = { '2': [5, 3] }
    const rowsById = buildPickupRowsByItem(items, splits)
    expect([...rowsById.keys()]).toEqual(['1', '2', '2#1'])
    expect(buildDefaultRowIds(items, splits)).toEqual(['1', '2', '2#1'])
  })

  it('splitPickupItem 对半拆分且件数守恒，数量不足 2 或已拆分时不变', () => {
    const single = buildItem({ itemId: '1', pickupQuantity: 1 })
    expect(splitPickupItem({}, single)).toEqual({})

    const odd = buildItem({ itemId: '2', pickupQuantity: 7 })
    expect(splitPickupItem({}, odd)).toEqual({ '2': [3, 4] })

    const already = { '2': [3, 4] }
    expect(splitPickupItem(already, odd)).toBe(already)
  })

  it('changePickupRowQuantity 差额调整到相邻份并保持守恒', () => {
    const item = buildItem({ itemId: '1', pickupQuantity: 8 })
    const moved = changePickupRowQuantity({ '1': [5, 3] }, item, 0, 6)
    expect(moved).toEqual({ '1': [6, 2] })

    // 末份改动时调整到前一份
    const tail = changePickupRowQuantity({ '1': [5, 3] }, item, 1, 5)
    expect(tail).toEqual({ '1': [3, 5] })

    // 相邻份不足 1 件时拒绝
    expect(changePickupRowQuantity({ '1': [7, 1] }, item, 0, 8)).toEqual({
      '1': [7, 1],
    })

    // 未拆分时不变
    expect(changePickupRowQuantity({}, item, 0, 3)).toEqual({})
  })

  it('removePickupSplitPart 把件数合并回相邻份，只剩一份时回到未拆分', () => {
    const merged = removePickupSplitPart({ '1': [5, 3] }, '1', 1)
    expect(merged).toEqual({})

    const three = removePickupSplitPart({ '1': [3, 3, 2] }, '1', 0)
    expect(three).toEqual({ '1': [6, 2] })
    expect(isSplitValue(three['1'])).toBe(true)
  })
})
