import type { SalesReturnCandidateItem } from '@/shared/schemas/module-record'

/** 退货来源导入的勾选与数量（默认值或本地草稿）。 */
export interface SalesReturnSelection {
  selectedIds: string[]
  quantityById: Record<string, number>
}

/**
 * 勾选与数量的本地草稿。
 *
 * <p>`source` 是派生这份草稿时的候选数据对象：候选一变（重新拉取或换出库单）草稿即作废，
 * 界面自动回退到默认值。用对象标识而不是"某处记得清空"来失效，避免漏清导致串单。</p>
 */
export interface SalesReturnSelectionDraft extends SalesReturnSelection {
  source: unknown
}

/** 草稿是否仍基于当前候选数据。 */
export function isSelectionDraftForSource<D extends SalesReturnSelectionDraft>(
  draft: D | null,
  source: unknown,
): draft is D {
  return draft !== null && draft.source === source
}

/** 默认选择：全部可退行勾选，数量取该行可退数量。 */
export function buildDefaultSelection(
  items: SalesReturnCandidateItem[],
): SalesReturnSelection {
  return {
    selectedIds: items.map((item) => item.sourceSalesOutboundItemId),
    quantityById: Object.fromEntries(
      items.map((item) => [
        item.sourceSalesOutboundItemId,
        item.returnableQuantity,
      ]),
    ),
  }
}

/**
 * 退货数量越界判定：负数、超过该行可退数量或非法数都算越界；
 * 未填写（undefined）不算越界 —— 那是"必须大于 0"的提交校验负责的事。
 *
 * <p>抽成纯函数：弹窗确认按钮的可用性与候选表行内报错必须共用同一口径，
 * 否则会出现"行内没报错但确认按钮点不动"这类自相矛盾的界面。</p>
 */
export function isItemQuantityOutOfRange(
  item: SalesReturnCandidateItem,
  quantityById: Record<string, number>,
): boolean {
  const value = quantityById[item.sourceSalesOutboundItemId]
  if (value === undefined) return false
  return !Number.isFinite(value) || value < 0 || value > item.returnableQuantity
}
