import { useMemo } from 'react'
import type { PrintRecordItem } from '@/api/system/print-template'
import { buildPrintItemMergeMarkers } from '@/views/modules/components/print-job-modal-utils'

interface Options {
  printItems: PrintRecordItem[]
  /** 用户手动拖拽后的行序（原始态，可能缺少新增明细）。 */
  orderedPrintItemIds: string[]
  excludedPrintItemIds: string[]
  outputPrintItemIds: string[]
  itemSelectionEnabled: boolean
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  showMergeGroup: boolean
}

/** 打印作业明细的派生数据：行序、选中集、已输出标记与合并分组标记。 */
export function usePrintJobItems({
  printItems,
  orderedPrintItemIds,
  excludedPrintItemIds,
  outputPrintItemIds,
  itemSelectionEnabled,
  brandOverrideEnabled,
  brandOverridesByItemId,
  showMergeGroup,
}: Options) {
  const orderedPrintItems = useMemo(() => {
    if (!orderedPrintItemIds.length) return printItems
    const printItemsById = new Map(printItems.map((item) => [item.id, item]))
    const result: PrintRecordItem[] = []
    for (const itemId of orderedPrintItemIds) {
      const item = printItemsById.get(itemId)
      if (item) result.push(item)
    }
    return result.length ? result : printItems
  }, [orderedPrintItemIds, printItems])

  const effectiveOrderedPrintItemIds = useMemo(
    () => orderedPrintItems.map((item) => item.id),
    [orderedPrintItems],
  )

  const excludedPrintItemIdSet = useMemo(
    () => new Set(excludedPrintItemIds),
    [excludedPrintItemIds],
  )

  const selectedPrintItems = useMemo(() => {
    if (!itemSelectionEnabled) return orderedPrintItems
    return orderedPrintItems.filter(
      (item) => !excludedPrintItemIdSet.has(item.id),
    )
  }, [excludedPrintItemIdSet, itemSelectionEnabled, orderedPrintItems])

  const outputPrintItemIdSet = useMemo(
    () => new Set(outputPrintItemIds),
    [outputPrintItemIds],
  )

  const mergeMarkersByItemId = useMemo(() => {
    if (!showMergeGroup) {
      return {}
    }
    return buildPrintItemMergeMarkers(
      selectedPrintItems,
      brandOverrideEnabled ? brandOverridesByItemId : {},
    )
  }, [
    brandOverrideEnabled,
    brandOverridesByItemId,
    selectedPrintItems,
    showMergeGroup,
  ])

  return {
    effectiveOrderedPrintItemIds,
    mergeMarkersByItemId,
    orderedPrintItems,
    outputPrintItemIdSet,
    selectedPrintItems,
  }
}
