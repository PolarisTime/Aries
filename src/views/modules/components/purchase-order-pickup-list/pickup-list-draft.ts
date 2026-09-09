import type { CollisionDetection } from '@dnd-kit/core'
import { closestCenter } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import type { EntityId } from '@/types/entity-id'

export interface PickupDraftGroup {
  id: string
  locked: boolean
  projectId?: EntityId
  remark: string
  itemIds: string[]
}

export interface PickupListDraft {
  dataKey: string
  groups: PickupDraftGroup[]
}

export const GROUP_DRAG_TYPE = 'pickup-group'
export const ITEM_DRAG_TYPE = 'pickup-item'

const DEFAULT_GROUP_ID = 'pickup-group-default'
const GROUP_DRAG_PREFIX = 'pickup-group:'
const WAREHOUSE_NAME_COLLATOR = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
})
const MATERIAL_TEXT_COLLATOR = new Intl.Collator('zh-CN', {
  sensitivity: 'base',
})
let nextPickupGroupId = 0

export const pickupListCollisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type !== GROUP_DRAG_TYPE) {
    return closestCenter(args)
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data.current?.type === GROUP_DRAG_TYPE,
    ),
  })
}

export function groupDragId(groupId: string) {
  return `${GROUP_DRAG_PREFIX}${groupId}`
}

export function groupIdFromDragId(dragId: string) {
  return dragId.startsWith(GROUP_DRAG_PREFIX)
    ? dragId.slice(GROUP_DRAG_PREFIX.length)
    : undefined
}

export function createPickupGroup(itemIds: string[] = []): PickupDraftGroup {
  nextPickupGroupId += 1
  return {
    id: `pickup-group-${nextPickupGroupId}`,
    locked: false,
    remark: '',
    itemIds,
  }
}

function warehouseGroupKey(item: PurchaseOrderPickupListItem) {
  const warehouseId = item.warehouseId?.trim()
  if (warehouseId) return `id:${warehouseId}`

  const warehouseName = item.warehouseName?.trim()
  return warehouseName ? `name:${warehouseName}` : 'unassigned'
}

function numericSortValue(value: string, ignoredCharacters: RegExp) {
  const numericText = value.replace(ignoredCharacters, '')
  if (!numericText) return undefined

  const numericValue = Number(numericText)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function compareNullableNumbers(left?: number, right?: number) {
  if (left === right) return 0
  if (left === undefined) return 1
  if (right === undefined) return -1
  return left - right
}

function compareByMaterialCatalogOrder(
  left: PurchaseOrderPickupListItem,
  right: PurchaseOrderPickupListItem,
) {
  // Mirrors MaterialSearchPolicy.DEFAULT_SORT and its generated numeric columns.
  return (
    MATERIAL_TEXT_COLLATOR.compare(left.material, right.material) ||
    compareNullableNumbers(
      numericSortValue(left.length ?? '0', /[^0-9.]/g),
      numericSortValue(right.length ?? '0', /[^0-9.]/g),
    ) ||
    MATERIAL_TEXT_COLLATOR.compare(left.brand, right.brand) ||
    compareNullableNumbers(
      numericSortValue(left.spec, /[^0-9]/g),
      numericSortValue(right.spec, /[^0-9]/g),
    )
  )
}

export function createWarehouseGroups(
  items: PurchaseOrderPickupListItem[],
): PickupDraftGroup[] {
  const buckets = new Map<
    string,
    {
      items: PurchaseOrderPickupListItem[]
      warehouseId: string
      warehouseName: string
    }
  >()
  for (const item of items) {
    const key = warehouseGroupKey(item)
    const warehouseName = item.warehouseName?.trim() || ''
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.items.push(item)
      if (!bucket.warehouseName && warehouseName) {
        bucket.warehouseName = warehouseName
      }
      continue
    }
    buckets.set(key, {
      items: [item],
      warehouseId: item.warehouseId?.trim() || '',
      warehouseName,
    })
  }

  return Array.from(buckets.values())
    .sort((left, right) => {
      if (Boolean(left.warehouseName) !== Boolean(right.warehouseName)) {
        return left.warehouseName ? -1 : 1
      }
      return (
        WAREHOUSE_NAME_COLLATOR.compare(
          left.warehouseName,
          right.warehouseName,
        ) ||
        WAREHOUSE_NAME_COLLATOR.compare(left.warehouseId, right.warehouseId)
      )
    })
    .map((bucket) =>
      createPickupGroup(
        bucket.items
          .toSorted(compareByMaterialCatalogOrder)
          .map((item) => item.itemId),
      ),
    )
}

export function resolveWarehouseLabel(
  items: PurchaseOrderPickupListItem[],
  unassignedLabel: string,
) {
  if (!items.length) return undefined

  const warehouseKeys = new Set(items.map(warehouseGroupKey))
  if (warehouseKeys.size !== 1) return undefined

  const warehouseNames = new Set(
    items
      .map((item) => item.warehouseName?.trim())
      .filter((name): name is string => Boolean(name)),
  )
  if (warehouseNames.size > 1) return undefined
  return warehouseNames.values().next().value || unassignedLabel
}

export function createDefaultDraft(
  dataKey: string,
  itemIds: string[],
): PickupListDraft {
  return {
    dataKey,
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        locked: false,
        remark: '',
        itemIds: [...itemIds],
      },
    ],
  }
}

export function resolveDraft(
  draft: PickupListDraft | null,
  dataKey: string,
  defaultItemIds: string[],
): PickupListDraft {
  if (!draft || draft.dataKey !== dataKey || !draft.groups.length) {
    return createDefaultDraft(dataKey, defaultItemIds)
  }

  const validItemIds = new Set(defaultItemIds)
  const assignedItemIds = new Set<string>()
  const filteredGroups = draft.groups.map((group) => ({
    ...group,
    locked: group.locked ?? false,
    itemIds: group.itemIds.filter((itemId) => {
      if (!validItemIds.has(itemId) || assignedItemIds.has(itemId)) return false
      assignedItemIds.add(itemId)
      return true
    }),
  }))
  const unassignedItemIds = defaultItemIds.filter(
    (itemId) => !assignedItemIds.has(itemId),
  )
  // 未分配的 item 归入第一个分组（与原实现一致，避免对数组元素赋值）
  const groups = filteredGroups.map((group, groupIndex) =>
    groupIndex === 0 && unassignedItemIds.length
      ? { ...group, itemIds: [...group.itemIds, ...unassignedItemIds] }
      : group,
  )

  return { ...draft, groups }
}

export function flattenGroupItemIds(groups: PickupDraftGroup[]) {
  return groups.flatMap((group) => group.itemIds)
}

export function reorderGroupedItems(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const sourceGroupIndex = groups.findIndex((group) =>
    group.itemIds.includes(activeId),
  )
  const targetGroupId = groupIdFromDragId(overId)
  const targetGroupIndex = targetGroupId
    ? groups.findIndex((group) => group.id === targetGroupId)
    : groups.findIndex((group) => group.itemIds.includes(overId))
  if (sourceGroupIndex < 0 || targetGroupIndex < 0) return groups

  if (sourceGroupIndex === targetGroupIndex) {
    const itemIds = groups[sourceGroupIndex].itemIds
    const activeIndex = itemIds.indexOf(activeId)
    const overIndex = itemIds.indexOf(overId)
    if (activeIndex < 0 || overIndex < 0) return groups
    return groups.map((group, index) =>
      index === sourceGroupIndex
        ? { ...group, itemIds: arrayMove(itemIds, activeIndex, overIndex) }
        : group,
    )
  }
  if (groups[sourceGroupIndex].locked || groups[targetGroupIndex].locked) {
    return groups
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    itemIds: [...group.itemIds],
  }))
  nextGroups[sourceGroupIndex].itemIds = nextGroups[
    sourceGroupIndex
  ].itemIds.filter((itemId) => itemId !== activeId)
  const targetItemIds = nextGroups[targetGroupIndex].itemIds
  const overIndex = targetGroupId
    ? targetItemIds.length
    : targetItemIds.indexOf(overId)
  targetItemIds.splice(
    overIndex < 0 ? targetItemIds.length : overIndex,
    0,
    activeId,
  )
  return nextGroups
}

export function reorderGroups(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const activeGroupId = groupIdFromDragId(activeId)
  const overGroupId = groupIdFromDragId(overId)
  if (!activeGroupId || !overGroupId) return groups

  const activeIndex = groups.findIndex((group) => group.id === activeGroupId)
  const overIndex = groups.findIndex((group) => group.id === overGroupId)
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return groups
  }
  return arrayMove(groups, activeIndex, overIndex)
}
