import { describe, expect, it } from 'vitest'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import {
  createPickupGroup,
  createWarehouseGroups,
  flattenGroupItemIds,
  groupDragId,
  groupIdFromDragId,
  reorderGroupedItems,
  reorderGroups,
  resolveDraft,
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
      buildItem({ itemId: '2', warehouseId: 'w1' }),
      buildItem({ itemId: '1', warehouseId: 'w1' }),
      buildItem({ itemId: '3', warehouseId: 'w2' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].itemIds).toEqual(['2', '1'])
    expect(groups[1].itemIds).toEqual(['3'])
  })

  it('createWarehouseGroups 无 id 时按仓库名分组，完全缺失时归入未指定组', () => {
    const groups = createWarehouseGroups([
      buildItem({ itemId: '1', warehouseName: '仓库A' }),
      buildItem({ itemId: '2' }),
      buildItem({ itemId: '3', warehouseName: '仓库A' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].itemIds).toEqual(['1', '3'])
    expect(groups[1].itemIds).toEqual(['2'])
  })

  it('createWarehouseGroups 空输入返回空数组', () => {
    expect(createWarehouseGroups([])).toEqual([])
  })

  it('resolveDraft 草稿为空或 dataKey 不匹配时回退默认单分组', () => {
    const draft = resolveDraft(null, 'key', ['1', '2'])
    expect(draft.groups).toHaveLength(1)
    expect(draft.groups[0].itemIds).toEqual(['1', '2'])

    const stale = resolveDraft({ dataKey: 'other', groups: [] }, 'key', ['1'])
    expect(stale.dataKey).toBe('key')
    expect(stale.groups).toHaveLength(1)
  })

  it('resolveDraft 过滤无效与重复 item，未分配项归入第一分组', () => {
    const base = resolveDraft(null, 'key', ['1', '2', '3'])
    const draft = resolveDraft(
      {
        dataKey: base.dataKey,
        groups: [
          { id: 'a', locked: false, remark: '', itemIds: ['1', 'ghost', '2'] },
          { id: 'b', locked: false, remark: '', itemIds: ['2', '3'] },
        ],
      },
      'key',
      ['1', '2', '3'],
    )
    expect(draft.groups[0].itemIds).toEqual(['1', '2'])
    expect(draft.groups[1].itemIds).toEqual(['3'])
  })

  it('resolveDraft 空 groups 回退默认分组', () => {
    const draft = resolveDraft({ dataKey: 'key', groups: [] }, 'key', ['1'])
    expect(draft.groups).toHaveLength(1)
    expect(draft.groups[0].itemIds).toEqual(['1'])
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
