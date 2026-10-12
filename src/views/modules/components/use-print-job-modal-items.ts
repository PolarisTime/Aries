import type { DragEndEvent } from '@dnd-kit/core'
import { useMemo } from 'react'
import type { PrintRecordItem } from '@/api/system/print-template'
import type { PrintJobModalAction } from '@/views/modules/components/print-job-modal-state'
import {
  buildPrintItemMergeGroups,
  reorderPrintItemIds,
  togglePrintItemSplitIds,
} from '@/views/modules/components/print-job-modal-utils'
import { usePrintJobItems } from '@/views/modules/use-print-job-items'

/**
 * 打印作业弹窗的明细派生状态：行序 / 选中集 / 拆分集合 / 合并分组 / 拖拽。
 *
 * <p>抽出原因：这组计算与交互在 PrintJobModal 里占到约 100 行且有 9 个分支，
 * 是 no-giant-component 与 no-high-complexity-react-function 的主要来源。
 * 拆成 hook 后弹窗只负责组合查询与渲染，明细语义集中在文件内便于核对。</p>
 */

export type PrintJobModalDispatch = React.Dispatch<PrintJobModalAction>

/** 用户拖拽后的行序可能与最新明细不同步: 先按现有明细过滤, 再补上新出现的行。 */
function normalizePrintItemOrder(
  currentOrder: string[],
  printItems: PrintRecordItem[],
) {
  const itemIds = printItems.map((item) => item.id)
  const itemIdSet = new Set(itemIds)
  const result: string[] = []
  for (const itemId of currentOrder) {
    if (itemIdSet.has(itemId)) {
      result.push(itemId)
    }
  }
  const existing = new Set(result)
  for (const itemId of itemIds) {
    if (!existing.has(itemId)) {
      result.push(itemId)
    }
  }
  return result
}

interface Options {
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: PrintJobModalDispatch
  excludedPrintItemIds: string[]
  itemSelectionEnabled: boolean
  mergeEquivalentItems: boolean
  mergeEquivalentItemsAvailable: boolean
  orderedPrintItemIds: string[]
  outputPrintItemIds: string[]
  printItems: PrintRecordItem[]
  splitItemIds: string[]
  splitPieceCount?: number
  splitPrintEnabled: boolean
}

export function usePrintJobModalItems({
  brandOverrideEnabled,
  brandOverridesByItemId,
  dispatch,
  excludedPrintItemIds,
  itemSelectionEnabled,
  mergeEquivalentItems,
  mergeEquivalentItemsAvailable,
  orderedPrintItemIds,
  outputPrintItemIds,
  printItems,
  splitItemIds,
  splitPieceCount,
  splitPrintEnabled,
}: Options) {
  const showMergeGroup = mergeEquivalentItemsAvailable && mergeEquivalentItems
  const {
    effectiveOrderedPrintItemIds,
    mergeMarkersByItemId,
    orderedPrintItems,
    outputPrintItemIdSet,
    selectedPrintItems,
  } = usePrintJobItems({
    printItems,
    orderedPrintItemIds,
    excludedPrintItemIds,
    outputPrintItemIds,
    itemSelectionEnabled,
    brandOverrideEnabled,
    brandOverridesByItemId,
    showMergeGroup,
  })

  const splitItemIdSet = useMemo(() => new Set(splitItemIds), [splitItemIds])
  const effectiveSplitItemIds = useMemo(() => {
    const itemIds: string[] = []
    for (const item of printItems) {
      if (splitItemIdSet.has(item.id)) itemIds.push(item.id)
    }
    return itemIds
  }, [printItems, splitItemIdSet])

  const mergeGroupByItemId = useMemo(() => {
    const groupByItemId: Record<string, string[]> = {}
    if (!showMergeGroup) return groupByItemId
    const groups = buildPrintItemMergeGroups(
      selectedPrintItems,
      brandOverrideEnabled ? brandOverridesByItemId : {},
    )
    for (const memberIds of groups) {
      for (const itemId of memberIds) {
        groupByItemId[itemId] = memberIds
      }
    }
    return groupByItemId
  }, [
    brandOverrideEnabled,
    brandOverridesByItemId,
    selectedPrintItems,
    showMergeGroup,
  ])

  const handleToggleSplitItem = (itemId: string) => {
    // 合并模式下拆分作用于整个同款组：勾选任一行即勾选全组，取消同理。
    const memberIds = mergeGroupByItemId[itemId] ?? [itemId]
    dispatch({
      type: 'setSplitItemIds',
      itemIds: togglePrintItemSplitIds(splitItemIds, memberIds),
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    dispatch({
      type: 'setOrderedPrintItemIds',
      itemIds: reorderPrintItemIds(
        normalizePrintItemOrder(orderedPrintItemIds, printItems),
        String(active.id),
        String(over.id),
      ),
    })
  }

  return {
    effectiveSplitItemIds,
    handleDragEnd,
    handleToggleSplitItem,
    mergeMarkersByItemId,
    orderedPrintItemIds: effectiveOrderedPrintItemIds,
    orderedPrintItems,
    outputPrintItemIdSet,
    selectedPrintItems,
    showMergeGroup,
    splitColumnEnabled: splitPrintEnabled,
    splitPieceCount,
  }
}

export type PrintJobItemsState = ReturnType<typeof usePrintJobModalItems>
