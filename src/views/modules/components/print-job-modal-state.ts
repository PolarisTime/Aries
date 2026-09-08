import type { PrintActionMode } from '@/shared/schemas'

export type PendingOutputAction = PrintActionMode | 'xlsx'

/** 参数配置表单承载的打印选项。 */
export type PrintOptionKey =
  | 'hideUnitPrice'
  | 'hideRemark'
  | 'enableBrandOverride'
  | 'enableItemSelection'

export interface PrintJobFormValues {
  mergeMode: 'merge' | 'split'
  printOptions: PrintOptionKey[]
  templateId?: string
}

export interface PrintJobModalState {
  brandOverridesByItemId: Record<string, string>
  orderedPrintItemIds: string[]
  excludedPrintItemIds: string[]
  outputPrintItemIds: string[]
  pendingOutputAction?: PendingOutputAction
}

export type PrintJobModalAction =
  | { type: 'setBrandOverride'; itemId: string; value: string }
  | { type: 'setOrderedPrintItemIds'; itemIds: string[] }
  | { type: 'setExcludedPrintItemIds'; itemIds: string[] }
  | { type: 'markPrintItemsOutput'; itemIds: string[] }
  | { type: 'setPendingOutputAction'; value?: PendingOutputAction }
  | { type: 'reset' }

export const INITIAL_PRINT_JOB_MODAL_STATE: PrintJobModalState = {
  brandOverridesByItemId: {},
  excludedPrintItemIds: [],
  orderedPrintItemIds: [],
  outputPrintItemIds: [],
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
