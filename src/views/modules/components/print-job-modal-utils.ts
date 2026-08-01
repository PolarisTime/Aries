import type { PrintRecordItem } from '@/api/system/print-template'

export const SALES_ORDER_A4_TEMPLATE_CODE = 'SALES_ORDER_YINGJIE_A4_REMARK_PDF'

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

export function buildPrintItemMergeMarkers(
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

  const markersByItemId: Record<string, PrintItemMergeMarker> = {}
  let groupIndex = 1
  for (const itemIds of itemIdsByMergeKey.values()) {
    if (itemIds.length < 2) continue
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
