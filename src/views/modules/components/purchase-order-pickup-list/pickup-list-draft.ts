import type { CollisionDetection } from '@dnd-kit/core'
import { closestCenter } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'

export interface PickupDraftGroup {
  id: string
  locked: boolean
  remark: string
  /** 行实例 id（拆分后为 `${itemId}#${partIndex}`，未拆分为 itemId）。 */
  itemIds: string[]
}

/** 拆分数量：baseItemId → 各份件数（长度>=2 才表示已拆分，之和恒等于原始件数）。 */
export type PickupSplits = Record<string, number[]>

export interface PickupListDraft {
  dataKey: string
  groups: PickupDraftGroup[]
  splits: PickupSplits
}

/** 提货清单行实例：把一条后端明细按拆分份数展开为若干可分组、可编辑数量的行。 */
export interface PickupListRow {
  rowId: string
  baseItemId: string
  item: PurchaseOrderPickupListItem
  quantity: number
  weightTon: number
  /** 份次下标（从 0 开始）。 */
  partIndex: number
  /** 该来源明细的份数（未拆分为 1）。 */
  partCount: number
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

const SPLIT_ROW_SEPARATOR = '#'
const WEIGHT_SCALE_FACTOR = 10 ** INTERNAL_WEIGHT_PRECISION

function splitRowId(baseItemId: string, partIndex: number) {
  return partIndex === 0
    ? baseItemId
    : `${baseItemId}${SPLIT_ROW_SEPARATOR}${partIndex}`
}

/** 每条来源明细是否已拆分（长度 > 1）。 */
export function isSplitValue(
  quantities: number[] | undefined,
): quantities is number[] {
  return Boolean(quantities && quantities.length > 1)
}

/**
 * 按件重比例折算各份重量：累计舍入保证各份之和与原重量一致
 * （与后端 PrintItemSplitter 同一算法，仅用于前端展示）。
 */
function splitWeightTon(
  totalWeightTon: number,
  quantities: number[],
): number[] {
  const totalQuantity = quantities.reduce((sum, value) => sum + value, 0)
  if (totalQuantity <= 0) {
    return quantities.map(() => 0)
  }
  const scaledTotalWeight = Math.round(totalWeightTon * WEIGHT_SCALE_FACTOR)
  const weights: number[] = []
  let cumulativeQuantity = 0
  let previousWeight = 0
  for (const quantity of quantities) {
    cumulativeQuantity += quantity
    const cumulativeWeight = Math.round(
      (scaledTotalWeight * cumulativeQuantity) / totalQuantity,
    )
    weights.push((cumulativeWeight - previousWeight) / WEIGHT_SCALE_FACTOR)
    previousWeight = cumulativeWeight
  }
  return weights
}

/**
 * 把一条后端明细按拆分份数展开为若干提货行；未拆分时返回单行，
 * 重量保持后端原值，拆分后按件重比例折算。
 */
export function buildPickupRows(
  item: PurchaseOrderPickupListItem,
  quantities: number[] | undefined,
): PickupListRow[] {
  if (!isSplitValue(quantities)) {
    return [
      {
        rowId: item.itemId,
        baseItemId: item.itemId,
        item,
        quantity: item.pickupQuantity,
        weightTon: item.pickupWeightTon,
        partIndex: 0,
        partCount: 1,
      },
    ]
  }
  const effectiveQuantities = quantities
  const weights = splitWeightTon(item.pickupWeightTon, effectiveQuantities)
  return effectiveQuantities.map((quantity, index) => ({
    rowId: splitRowId(item.itemId, index),
    baseItemId: item.itemId,
    item,
    quantity,
    weightTon: weights[index],
    partIndex: index,
    partCount: effectiveQuantities.length,
  }))
}

/** 汇总全部来源明细的行实例，供渲染与草稿解析使用。 */
export function buildPickupRowsByItem(
  items: PurchaseOrderPickupListItem[],
  splits: PickupSplits,
): Map<string, PickupListRow> {
  const rowsById = new Map<string, PickupListRow>()
  for (const item of items) {
    for (const row of buildPickupRows(item, splits[item.itemId])) {
      rowsById.set(row.rowId, row)
    }
  }
  return rowsById
}

/** 行实例 id 的有序列表，替代原 itemIds 作为分组默认顺序。 */
export function buildDefaultRowIds(
  items: PurchaseOrderPickupListItem[],
  splits: PickupSplits,
): string[] {
  return items.flatMap((item) =>
    buildPickupRows(item, splits[item.itemId]).map((row) => row.rowId),
  )
}

/** 拆分一条明细为两份（默认对半），保持件数守恒；已拆分或数量不足 2 时不变。 */
export function splitPickupItem(
  splits: PickupSplits,
  item: PurchaseOrderPickupListItem,
): PickupSplits {
  if (isSplitValue(splits[item.itemId]) || item.pickupQuantity < 2) {
    return splits
  }
  const first = Math.floor(item.pickupQuantity / 2)
  return {
    ...splits,
    [item.itemId]: [first, item.pickupQuantity - first],
  }
}

/**
 * 修改某行数量：差额调整到同来源的下一行（末行则调上一行），保证件数守恒；
 * 目标行不足 1 件或总量非法时返回原对象。
 */
export function changePickupRowQuantity(
  splits: PickupSplits,
  item: PurchaseOrderPickupListItem,
  partIndex: number,
  nextQuantity: number,
): PickupSplits {
  const quantities = splits[item.itemId]
  if (!isSplitValue(quantities)) {
    return splits
  }
  const effectiveQuantities = quantities
  if (partIndex < 0 || partIndex >= effectiveQuantities.length) {
    return splits
  }
  const siblingIndex =
    partIndex === effectiveQuantities.length - 1 ? partIndex - 1 : partIndex + 1
  const sibling = effectiveQuantities[siblingIndex]
  const total = effectiveQuantities.reduce((sum, value) => sum + value, 0)
  const delta = Math.trunc(nextQuantity) - effectiveQuantities[partIndex]
  const nextSibling = sibling - delta
  if (!Number.isFinite(delta) || nextSibling < 1) {
    return splits
  }
  const nextQuantities = [...effectiveQuantities]
  nextQuantities[partIndex] += delta
  nextQuantities[siblingIndex] = nextSibling
  if (nextQuantities.some((value) => value < 1)) {
    return splits
  }
  const verifiedTotal = nextQuantities.reduce((sum, value) => sum + value, 0)
  if (verifiedTotal !== total) {
    return splits
  }
  return { ...splits, [item.itemId]: nextQuantities }
}

/**
 * 删除一个拆分份：把该份件数合并回相邻份（末份则并入前一份），保持件数守恒；
 * 合并后只剩一份时回到未拆分。未拆分或索引非法时返回原对象。
 */
export function removePickupSplitPart(
  splits: PickupSplits,
  itemId: string,
  partIndex: number,
): PickupSplits {
  const quantities = splits[itemId]
  if (!isSplitValue(quantities)) {
    return splits
  }
  const effectiveQuantities = quantities
  if (partIndex < 0 || partIndex >= effectiveQuantities.length) {
    return splits
  }
  const siblingIndex =
    partIndex === effectiveQuantities.length - 1 ? partIndex - 1 : partIndex + 1
  const nextQuantities = effectiveQuantities.map((value, index) =>
    index === siblingIndex ? value + effectiveQuantities[partIndex] : value,
  )
  nextQuantities.splice(partIndex, 1)
  if (nextQuantities.length <= 1) {
    const { [itemId]: _removed, ...rest } = splits
    return rest
  }
  return { ...splits, [itemId]: nextQuantities }
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

/**
 * 按仓库把提货行分配到分组：同一明细拆出的多行归属同一仓库，因此同组内相邻排列；
 * 组内按商品目录排序，拆分份之间保持原有份次顺序。
 */
export function createWarehouseGroups(
  rows: PickupListRow[],
): PickupDraftGroup[] {
  const buckets = new Map<
    string,
    {
      rows: PickupListRow[]
      warehouseId: string
      warehouseName: string
    }
  >()
  for (const row of rows) {
    const key = warehouseGroupKey(row.item)
    const warehouseName = row.item.warehouseName?.trim() || ''
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.rows.push(row)
      if (!bucket.warehouseName && warehouseName) {
        bucket.warehouseName = warehouseName
      }
      continue
    }
    buckets.set(key, {
      rows: [row],
      warehouseId: row.item.warehouseId?.trim() || '',
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
        bucket.rows
          .toSorted((left, right) =>
            compareByMaterialCatalogOrder(left.item, right.item),
          )
          .map((row) => row.rowId),
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
  rowIds: string[],
): PickupListDraft {
  return {
    dataKey,
    splits: {},
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        locked: false,
        remark: '',
        itemIds: [...rowIds],
      },
    ],
  }
}

/**
 * 解析草稿：dataKey 不匹配或空分组时回退默认单分组（依当前拆分份展开）；
 * 过滤已失效（来源明细被移除或拆分份减少）的行实例并去重；
 * 新增的拆分份插到其来源行之后（保持同组相邻），无来源时归入第一个分组。
 */
export function resolveDraft(
  draft: PickupListDraft | null,
  dataKey: string,
  items: PurchaseOrderPickupListItem[],
): PickupListDraft {
  const splits = draft?.dataKey === dataKey ? draft.splits : {}
  const defaultRowIds = buildDefaultRowIds(items, splits)
  if (!draft || draft.dataKey !== dataKey || !draft.groups.length) {
    return createDefaultDraft(dataKey, defaultRowIds)
  }

  const validRowIds = new Set(defaultRowIds)
  const assignedRowIds = new Set<string>()
  const filteredGroups = draft.groups.map((group) => ({
    ...group,
    locked: group.locked ?? false,
    itemIds: group.itemIds.filter((rowId) => {
      if (!validRowIds.has(rowId) || assignedRowIds.has(rowId)) return false
      assignedRowIds.add(rowId)
      return true
    }),
  }))
  const unassignedRowIds = defaultRowIds.filter(
    (rowId) => !assignedRowIds.has(rowId),
  )
  if (!unassignedRowIds.length) {
    return { ...draft, groups: filteredGroups }
  }

  // 新增拆分份插到同来源同组行的最后一份之后；组内找不到来源时依次降级：
  // 该来源所在的其它分组 → 第一个分组。
  const groups = filteredGroups.map((group) => ({ ...group }))
  for (const rowId of unassignedRowIds) {
    const base = baseItemIdFromRowId(rowId)
    const targetIndex = groups.findIndex((group) =>
      group.itemIds.some((existing) => baseItemIdFromRowId(existing) === base),
    )
    const resolvedIndex = targetIndex < 0 ? 0 : targetIndex
    const target = groups[resolvedIndex]
    if (!target) continue
    const lastSiblingIndex = target.itemIds.reduce(
      (last, existing, index) =>
        baseItemIdFromRowId(existing) === base ? index : last,
      -1,
    )
    const insertIndex =
      lastSiblingIndex < 0 ? target.itemIds.length : lastSiblingIndex + 1
    target.itemIds = [...target.itemIds]
    target.itemIds.splice(insertIndex, 0, rowId)
  }

  return { ...draft, groups }
}

/** 由行实例 id 还原来源明细 id；拆分行的 `${itemId}#${n}` 与原始 itemId 共用同一 base。 */
export function baseItemIdFromRowId(rowId: string) {
  const separatorIndex = rowId.indexOf(SPLIT_ROW_SEPARATOR)
  return separatorIndex < 0 ? rowId : rowId.slice(0, separatorIndex)
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
