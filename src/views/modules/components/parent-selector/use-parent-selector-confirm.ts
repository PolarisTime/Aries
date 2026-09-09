import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import type { ParentSelectorTranslator } from './parent-selector-mode'
import { buildSelectedSummary } from './parent-selector-mode'
import { needsParentDetail } from './use-parent-selector-data'

async function resolveParentImportRecords(
  parentModuleKey: string,
  records: ModuleRecord[],
  candidateStatementModuleKey?: string,
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  if (candidateStatementModuleKey || candidateQueryType) {
    return records
  }
  const resolvedRecords = await Promise.all(
    records.map(async (record) => {
      if (!record.id || !needsParentDetail(record)) {
        return record
      }
      const detail = await getBusinessModuleDetail(
        parentModuleKey,
        String(record.id),
      )
      return detail
    }),
  )
  return resolvedRecords
}

export interface UseParentSelectorConfirmParams {
  parentModuleKey: string
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
  selectedRows: ModuleRecord[]
  displayFieldKey: string
  allowMultipleSelection: boolean
  t: ParentSelectorTranslator
  onSelect: (records: ModuleRecord[]) => void
  onClose: () => void
}

export function useParentSelectorConfirm({
  parentModuleKey,
  candidateStatementModuleKey,
  candidateQueryType,
  selectedRows,
  displayFieldKey,
  allowMultipleSelection,
  t,
  onSelect,
  onClose,
}: UseParentSelectorConfirmParams) {
  const selectedSummary = buildSelectedSummary({
    allowMultipleSelection,
    selectedRows,
    displayFieldKey,
    t,
  })

  const handleImportRecords = async (recordsToImport: ModuleRecord[]) => {
    try {
      const resolvedRecords = await resolveParentImportRecords(
        parentModuleKey,
        recordsToImport,
        candidateStatementModuleKey,
        candidateQueryType,
      )
      if (resolvedRecords.some(isDeletedModuleRecord)) {
        message.error(t('modules.importParentFailed'))
        return
      }
      onSelect(resolvedRecords)
      onClose()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.importParentFailed'),
      )
    }
  }

  return {
    selectedSummary,
    handleImportRecords,
  }
}
