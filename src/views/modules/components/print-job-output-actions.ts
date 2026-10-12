import type { Dispatch } from 'react'
import type { SalesOrderPrintXlsxOptions } from '@/api/system/print-template'
import type { PrintRenderOptions } from '@/hooks/useBusinessGridPrintActions'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type {
  PendingOutputAction,
  printJobModalReducer,
} from '@/views/modules/components/print-job-modal-state'

/**
 * 打印输出动作从 PrintJobModal.tsx 抽到这里的原因：该模块只导出组件，
 * 混入非组件导出会触发 react-doctor/only-export-components，也违背
 * Fast Refresh 对「组件文件只导出组件」的要求。动作本身与渲染无关，
 * 单独成文件后既便于被 spec 直接引用，也不再参与组件的热更新边界。
 */
export interface PrintJobOutputActionsInput {
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: Dispatch<Parameters<typeof printJobModalReducer>[1]>
  hideRemark: boolean
  hideUnitPrice: boolean
  itemSelectionEnabled: boolean
  mergeEquivalentItems: boolean
  mergeEquivalentItemsAvailable: boolean
  onExportPrintXlsx?: (
    printOptions?: SalesOrderPrintXlsxOptions,
  ) => Promise<boolean>
  onPrint: (
    mode: PrintActionMode,
    template: PrintTemplateRecord,
    printOptions?: PrintRenderOptions,
  ) => Promise<boolean>
  /** 实际打印/导出成功后回调, 用于记忆项目级模板偏好(预览不记忆)。 */
  onTemplateUsed?: (templateId: string) => void
  orderedPrintItemIds: string[]
  selectedItemIds: string[]
  selectedTemplate?: PrintTemplateRecord
  splitItemIds?: string[]
  splitPieceCount?: number
}

export function createPrintJobOutputActions({
  brandOverrideEnabled,
  brandOverridesByItemId,
  dispatch,
  hideRemark,
  hideUnitPrice,
  itemSelectionEnabled,
  mergeEquivalentItems,
  mergeEquivalentItemsAvailable,
  onExportPrintXlsx,
  onPrint,
  onTemplateUsed,
  orderedPrintItemIds,
  selectedItemIds,
  selectedTemplate,
  splitItemIds,
  splitPieceCount,
}: PrintJobOutputActionsInput) {
  const currentBrandOverridesByItemId = () => {
    const normalizedBrandOverridesByItemId: Record<string, string> = {}
    for (const [itemId, value] of Object.entries(brandOverridesByItemId)) {
      const trimmed = value.trim()
      if (trimmed) {
        normalizedBrandOverridesByItemId[itemId] = trimmed
      }
    }
    return brandOverrideEnabled &&
      Object.keys(normalizedBrandOverridesByItemId).length
      ? normalizedBrandOverridesByItemId
      : undefined
  }

  // 三通道共享的打印选项：hideRemark/选中项/行序/品牌覆盖全通道一致，
  // mergeEquivalentItems 仅 LODOP/PDF 渲染通道支持（xlsx 导出无合并语义）。
  const currentOutputOptions = (): PrintRenderOptions &
    SalesOrderPrintXlsxOptions => {
    return {
      hideUnitPrice,
      hideRemark,
      ...(mergeEquivalentItemsAvailable ? { mergeEquivalentItems } : {}),
      ...(itemSelectionEnabled ? { selectedItemIds } : {}),
      ...(orderedPrintItemIds.length ? { itemOrder: orderedPrintItemIds } : {}),
      ...(currentBrandOverridesByItemId()
        ? { brandOverridesByItemId: currentBrandOverridesByItemId() }
        : {}),
      // 拆分件数与逐行拆分集合必须成对下传：空数组表示勾选了拆分打印但没有勾选任何行。
      ...(splitPieceCount
        ? { splitPieceCount, splitItemIds: splitItemIds ?? [] }
        : {}),
    }
  }

  /** xlsx 导出选项：剥离渲染通道专属的合并开关。 */
  const toXlsxOptions = (
    options: PrintRenderOptions,
  ): SalesOrderPrintXlsxOptions => {
    const { mergeEquivalentItems: _mergeEquivalentItems, ...xlsxOptions } =
      options
    void _mergeEquivalentItems
    return xlsxOptions
  }

  const markSelectedPrintItemsOutput = (itemIds: string[]) => {
    if (!itemSelectionEnabled || !itemIds.length) return
    dispatch({ type: 'markPrintItemsOutput', itemIds })
  }

  /**
   * 三通道统一输出入口：preview/print/download 走渲染通道，xlsx 走导出通道。
   * 防重入、已打印标记与状态清理逻辑单一实现。
   */
  const handleOutput = (mode: PendingOutputAction): Promise<void> => {
    const exportHandler = onExportPrintXlsx
    if (mode !== 'xlsx' && !selectedTemplate) {
      return Promise.resolve()
    }
    if (mode === 'xlsx' && !exportHandler) {
      return Promise.resolve()
    }
    // 守卫已保证：xlsx 分支必有 exportHandler、渲染分支必有 template；
    // 先于 dispatch 捕获快照，避免重渲染后引用变化。
    const template = selectedTemplate
    const options = currentOutputOptions()
    dispatch({ type: 'setPendingOutputAction', value: mode })
    const run =
      mode === 'xlsx'
        ? (exportHandler as NonNullable<typeof exportHandler>)(
            toXlsxOptions(options),
          )
        : onPrint(mode, template as NonNullable<typeof template>, options)
    return run
      .then((succeeded) => {
        if (succeeded && mode !== 'preview') {
          markSelectedPrintItemsOutput(selectedItemIds)
          if (template) onTemplateUsed?.(template.id)
        }
      })
      .finally(() => {
        dispatch({ type: 'setPendingOutputAction' })
      })
  }

  return {
    handleExportPrintXlsx: () => handleOutput('xlsx'),
    handlePrint: (mode: PrintActionMode) => handleOutput(mode),
  }
}
