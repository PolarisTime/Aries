import { useMemo, useState } from 'react'
import type {
  PurchaseOrderPickupList,
  PurchaseOrderPickupListItem,
} from '@/api/purchase/purchase-order-pickup-list'
import type { EntityId } from '@/types/entity-id'
import {
  buildDefaultRowIds,
  buildPickupRowsByItem,
  changePickupRowQuantity,
  createPickupGroup,
  createWarehouseGroups,
  flattenGroupItemIds,
  type PickupListDraft,
  type PickupListRow,
  removePickupSplitPart,
  reorderGroupedItems,
  reorderGroups,
  resolveDraft,
  splitPickupItem,
} from './pickup-list-draft'

export interface PickupListDraftController {
  activeDraft: PickupListDraft
  defaultItems: PurchaseOrderPickupListItem[]
  /** 分组 id → 该分组内的提货行（含拆分份）。 */
  groupedRows: Map<string, PickupListRow[]>
  /** 拆分后的总件数与总重量（与后端原始口径一致）。 */
  totals: { quantity: number; weightTon: number }
  /** 是否偏离默认草稿（分组/备注/锁定/拆分任一改变）。 */
  hasCustomDraft: boolean
  updateDraft: (updater: (current: PickupListDraft) => PickupListDraft) => void
  handleDragEnd: (
    activeId: string,
    overId: string,
    isGroupDrag: boolean,
  ) => void
  handleDragOver: (activeId: string, overId: string) => void
  removeGroup: (groupId: string) => void
  setGroupRemark: (groupId: string, remark: string) => void
  setGroupLocked: (groupId: string, locked: boolean) => void
  addGroup: () => void
  groupByWarehouse: () => void
  resetDraft: () => void
  splitRow: (row: PickupListRow) => void
  mergeRow: (row: PickupListRow) => void
  removeRowPart: (row: PickupListRow) => void
  changeRowQuantity: (row: PickupListRow, quantity: number) => void
}

/**
 * 提货清单草稿控制器：把「来源明细 + 拆分份 → 行实例 + 分组」的派生、
 * 拖拽排序与数量拆分操作集中到一个 hook，组件只负责渲染。
 * 草稿只在内存中维护，不写回采购订单。
 */
export function usePickupListDraft(
  data: PurchaseOrderPickupList | undefined,
  orderIds: EntityId[],
): PickupListDraftController {
  const [pickupDraft, setPickupDraft] = useState<PickupListDraft | null>(null)
  const defaultItems = useMemo(
    () => data?.groups.flatMap((group) => group.items) || [],
    [data],
  )
  const dataKey = useMemo(
    () =>
      `${orderIds.join(',')}:${defaultItems.map((item) => item.itemId).join(',')}`,
    [defaultItems, orderIds],
  )
  const activeDraft = useMemo(
    () => resolveDraft(pickupDraft, dataKey, defaultItems),
    [dataKey, defaultItems, pickupDraft],
  )
  const rowsById = useMemo(
    () => buildPickupRowsByItem(defaultItems, activeDraft.splits),
    [defaultItems, activeDraft.splits],
  )

  const updateDraft = (
    updater: (current: PickupListDraft) => PickupListDraft,
  ) => {
    setPickupDraft((current) =>
      updater(resolveDraft(current, dataKey, defaultItems)),
    )
  }

  const handleDragEnd = (
    activeId: string,
    overId: string,
    isGroupDrag: boolean,
  ) => {
    updateDraft((current) => ({
      ...current,
      groups: isGroupDrag
        ? reorderGroups(current.groups, activeId, overId)
        : reorderGroupedItems(current.groups, activeId, overId),
    }))
  }

  const handleDragOver = (activeId: string, overId: string) => {
    updateDraft((current) => {
      const groups = reorderGroupedItems(current.groups, activeId, overId)
      return groups === current.groups ? current : { ...current, groups }
    })
  }

  const removeGroup = (groupId: string) => {
    updateDraft((current) => {
      const groupIndex = current.groups.findIndex(
        (group) => group.id === groupId,
      )
      if (groupIndex < 0 || current.groups.length === 1) return current

      const removedGroup = current.groups[groupIndex]
      const groups = current.groups.flatMap((group) =>
        group.id === groupId ? [] : [{ ...group, itemIds: [...group.itemIds] }],
      )
      if (groupIndex === 0) {
        groups[0].itemIds = [...removedGroup.itemIds, ...groups[0].itemIds]
      } else {
        groups[groupIndex - 1].itemIds.push(...removedGroup.itemIds)
      }
      return { ...current, groups }
    })
  }

  const setGroupRemark = (groupId: string, remark: string) => {
    updateDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, remark } : group,
      ),
    }))
  }

  const setGroupLocked = (groupId: string, locked: boolean) => {
    updateDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, locked } : group,
      ),
    }))
  }

  const addGroup = () => {
    updateDraft((current) => ({
      ...current,
      groups: [...current.groups, createPickupGroup()],
    }))
  }

  const groupByWarehouse = () => {
    const groups = createWarehouseGroups(Array.from(rowsById.values()))
    if (!groups.length) return
    updateDraft((current) => ({ ...current, groups }))
  }

  const applySplits = (
    resolve: (current: PickupListDraft) => PickupListDraft['splits'],
  ) => {
    updateDraft((current) => {
      const splits = resolve(current)
      return splits === current.splits ? current : { ...current, splits }
    })
  }

  const splitRow = (row: PickupListRow) =>
    applySplits((current) => splitPickupItem(current.splits, row.item))

  const mergeRow = (row: PickupListRow) =>
    // 合并该来源全部拆分份：清空该明细的拆分记录即可（件数守恒）。
    applySplits((current) => {
      const { [row.baseItemId]: _removed, ...splits } = current.splits
      return splits
    })

  const removeRowPart = (row: PickupListRow) =>
    applySplits((current) =>
      removePickupSplitPart(current.splits, row.baseItemId, row.partIndex),
    )

  const changeRowQuantity = (row: PickupListRow, quantity: number) =>
    applySplits((current) =>
      changePickupRowQuantity(
        current.splits,
        row.item,
        row.partIndex,
        quantity,
      ),
    )

  const groupedRows = useMemo(
    () =>
      new Map(
        activeDraft.groups.map((group) => [
          group.id,
          group.itemIds.flatMap((rowId) => {
            const row = rowsById.get(rowId)
            return row ? [row] : []
          }),
        ]),
      ),
    [activeDraft.groups, rowsById],
  )

  const totals = useMemo(() => {
    let quantity = 0
    let weightTon = 0
    for (const row of rowsById.values()) {
      quantity += row.quantity
      weightTon += row.weightTon
    }
    return { quantity, weightTon }
  }, [rowsById])

  const defaultRowIds = useMemo(
    () => buildDefaultRowIds(defaultItems, {}),
    [defaultItems],
  )
  const hasCustomDraft =
    activeDraft.groups.length !== 1 ||
    Object.keys(activeDraft.splits).length > 0 ||
    activeDraft.groups.some(
      (group) => group.locked || group.remark.length > 0,
    ) ||
    flattenGroupItemIds(activeDraft.groups).some(
      (rowId, index) => rowId !== defaultRowIds[index],
    )

  return {
    activeDraft,
    defaultItems,
    groupedRows,
    totals,
    hasCustomDraft,
    updateDraft,
    handleDragEnd,
    handleDragOver,
    removeGroup,
    setGroupRemark,
    setGroupLocked,
    addGroup,
    groupByWarehouse,
    resetDraft: () => setPickupDraft(null),
    splitRow,
    mergeRow,
    removeRowPart,
    changeRowQuantity,
  }
}
