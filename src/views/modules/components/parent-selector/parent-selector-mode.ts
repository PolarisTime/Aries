import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type ParentSelectorTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

export type ParentSelectorFormatCellValue = (
  value: unknown,
  type?: 'date' | 'amount' | 'weight' | 'status',
) => string

export function buildSelectedSummary({
  allowMultipleSelection,
  selectedRows,
  displayFieldKey,
  t,
}: {
  allowMultipleSelection: boolean
  selectedRows: ModuleRecord[]
  displayFieldKey: string
  t: ParentSelectorTranslator
}) {
  const selectedOrderCount = selectedRows.length
  const selectedLineCount = selectedRows.reduce(
    (sum, row) => sum + (Array.isArray(row.items) ? row.items.length : 0),
    0,
  )
  const hasImportableQuantity = selectedRows.some((row) =>
    Number.isFinite(Number(row.importableQuantity)),
  )
  const selectedImportableQuantity = selectedRows.reduce(
    (sum, row) => sum + Math.max(Number(row.importableQuantity) || 0, 0),
    0,
  )
  return allowMultipleSelection
    ? hasImportableQuantity
      ? t('modules.parentSelector.selectedMultiSummary', {
          orderCount: selectedOrderCount,
          lineCount: selectedLineCount,
          importableQuantity: selectedImportableQuantity,
        })
      : t('modules.parentSelector.selectedMultiSummarySimple', {
          orderCount: selectedOrderCount,
          lineCount: selectedLineCount,
        })
    : selectedOrderCount
      ? t('modules.parentSelector.selectedSingleSummary', {
          count: selectedOrderCount,
          docNo:
            asString(selectedRows[0]?.[displayFieldKey]).trim() ||
            asString(selectedRows[0]?.id),
        })
      : t('modules.parentSelector.selectedEmptyHint')
}
