import type { PrintActionMode } from '@/shared/schemas'

export type PendingOutputAction = PrintActionMode | 'xlsx'

/** 参数配置表单承载的打印选项。 */
export type PrintOptionKey =
  | 'hideUnitPrice'
  | 'hideRemark'
  | 'enableBrandOverride'
  | 'enableItemSelection'
  | 'enableSplitPrint'

export interface PrintJobFormValues {
  /**
   * 同款合并打印：勾选后「品牌+类别+材质+规格+定尺」相同的明细合并成一行（数量/重量/金额求和）。
   * 仅布局声明 `options.merge` 的模块（当前为销售订单）显示该开关。
   */
  mergeEquivalentItems: boolean
  printOptions: PrintOptionKey[]
  templateId?: string
  splitPieceCount?: number
}

/** 拆分打印的每份件数必须是 ≥1 的整数。 */
export function isValidSplitPieceCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

/**
 * 仅当勾选「拆分打印」且件数为有效正整数时返回该件数，
 * 其余情况返回 undefined，避免把空值或非法值传给后端。
 */
export function resolveSplitPieceCount(
  printOptions: readonly PrintOptionKey[],
  value: unknown,
): number | undefined {
  return printOptions.includes('enableSplitPrint') &&
    isValidSplitPieceCount(value)
    ? value
    : undefined
}

export interface PrintJobModalState {
  brandOverridesByItemId: Record<string, string>
  orderedPrintItemIds: string[]
  excludedPrintItemIds: string[]
  outputPrintItemIds: string[]
  splitItemIds: string[]
  pendingOutputAction?: PendingOutputAction
}

export type PrintJobModalAction =
  | { type: 'setBrandOverride'; itemId: string; value: string }
  | { type: 'setOrderedPrintItemIds'; itemIds: string[] }
  | { type: 'setExcludedPrintItemIds'; itemIds: string[] }
  | { type: 'setSplitItemIds'; itemIds: string[] }
  | { type: 'markPrintItemsOutput'; itemIds: string[] }
  | { type: 'setPendingOutputAction'; value?: PendingOutputAction }
  | { type: 'reset' }

export const INITIAL_PRINT_JOB_MODAL_STATE: PrintJobModalState = {
  brandOverridesByItemId: {},
  excludedPrintItemIds: [],
  orderedPrintItemIds: [],
  outputPrintItemIds: [],
  splitItemIds: [],
}

export function printJobModalReducer(
  state: PrintJobModalState,
  action: PrintJobModalAction,
): PrintJobModalState {
  switch (action.type) {
    case 'setBrandOverride':
      return {
        ...state,
        brandOverridesByItemId: {
          ...state.brandOverridesByItemId,
          [action.itemId]: action.value,
        },
      }
    case 'setOrderedPrintItemIds':
      return { ...state, orderedPrintItemIds: action.itemIds }
    case 'setExcludedPrintItemIds':
      return { ...state, excludedPrintItemIds: action.itemIds }
    case 'setSplitItemIds':
      return { ...state, splitItemIds: action.itemIds }
    case 'markPrintItemsOutput':
      return {
        ...state,
        outputPrintItemIds: Array.from(
          new Set([...state.outputPrintItemIds, ...action.itemIds]),
        ),
      }
    case 'setPendingOutputAction':
      return { ...state, pendingOutputAction: action.value }
    case 'reset':
      return INITIAL_PRINT_JOB_MODAL_STATE
  }
}
