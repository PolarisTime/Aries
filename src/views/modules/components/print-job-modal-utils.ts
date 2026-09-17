import type { PrintRecordItem } from '@/api/system/print-template'

export interface PrintItemMergeMarker {
  groupIndex: number
  itemCount: number
}

export function reorderPrintItemIds(
  order: string[],
  activeId: string,
  overId: string,
) {
  const oldIndex = order.indexOf(activeId)
  const newIndex = order.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return order
  }

  const next = [...order]
  next.splice(oldIndex, 1)
  next.splice(newIndex, 0, activeId)
  return next
}

/** 切换拆分勾选：组内全部已勾选则取消全组，否则勾选全组（单行为组长度 1）。 */
export function togglePrintItemSplitIds(
  current: string[],
  memberIds: string[],
): string[] {
  const next = new Set(current)
  const shouldRemove =
    memberIds.length > 0 && memberIds.every((itemId) => next.has(itemId))
  for (const itemId of memberIds) {
    if (shouldRemove) {
      next.delete(itemId)
    } else {
      next.add(itemId)
    }
  }
  return Array.from(next)
}

function normalizedPrintItemField(value: string | undefined) {
  return value?.trim() ?? ''
}

function printItemMergeKey(
  item: PrintRecordItem,
  brandOverridesByItemId: Record<string, string>,
) {
  const brand = normalizedPrintItemField(
    brandOverridesByItemId[item.id] || item.brand,
  )
  const category = normalizedPrintItemField(item.category)
  const material = normalizedPrintItemField(item.material)
  const spec = normalizedPrintItemField(item.spec)
  const length = normalizedPrintItemField(item.length)
  if (!brand || !spec || !length) return null
  return JSON.stringify([brand, category, material, spec, length])
}

/**
 * 按后端合并键（品牌/类别/材质/规格/长度）返回可合并分组，仅包含 ≥2 行的分组；
 * 组内顺序保持传入明细顺序，与后端合并后的代表行（组内首行）一致。
 */
export function buildPrintItemMergeGroups(
  items: PrintRecordItem[],
  brandOverridesByItemId: Record<string, string>,
) {
  const itemIdsByMergeKey = new Map<string, string[]>()
  for (const item of items) {
    const mergeKey = printItemMergeKey(item, brandOverridesByItemId)
    if (!mergeKey) continue
    const itemIds = itemIdsByMergeKey.get(mergeKey) ?? []
    itemIds.push(item.id)
    itemIdsByMergeKey.set(mergeKey, itemIds)
  }

  return Array.from(itemIdsByMergeKey.values()).filter(
    (itemIds) => itemIds.length >= 2,
  )
}

export function buildPrintItemMergeMarkers(
  items: PrintRecordItem[],
  brandOverridesByItemId: Record<string, string>,
) {
  const markersByItemId: Record<string, PrintItemMergeMarker> = {}
  let groupIndex = 1
  for (const itemIds of buildPrintItemMergeGroups(
    items,
    brandOverridesByItemId,
  )) {
    for (const itemId of itemIds) {
      markersByItemId[itemId] = {
        groupIndex,
        itemCount: itemIds.length,
      }
    }
    groupIndex += 1
  }
  return markersByItemId
}
