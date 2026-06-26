import {
  type AuditTarget,
  useBusinessGridBatchActions,
} from '@/hooks/useBusinessGridBatchActions'
import { useBusinessGridFreightActions } from '@/hooks/useBusinessGridFreightActions'
import { useBusinessGridPrintActions } from '@/hooks/useBusinessGridPrintActions'
import { useBusinessGridStatementActions } from '@/hooks/useBusinessGridStatementActions'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  submittedFilters: SearchParams
  listAuditTarget: AuditTarget | null
  listReverseAuditTarget: AuditTarget | null
  refreshModuleQueries: () => Promise<void>
  clearSelection: () => void
  formatCellValue: (value: unknown, columnType?: string) => string
}

export function useBusinessGridActions({
  moduleKey,
  selectedRowKeys,
  selectedRows,
  submittedFilters,
  listAuditTarget,
  listReverseAuditTarget,
  refreshModuleQueries,
  clearSelection,
  formatCellValue,
}: Props) {
  const refreshAndClearSelection = async () => {
    clearSelection()
    await refreshModuleQueries()
  }

  const { handlePrintSelectedRecords, handleExportSalesOrderPrintXlsx } =
    useBusinessGridPrintActions({
      moduleKey,
      selectedRowKeys,
      selectedRows,
    })

  const {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
  } = useBusinessGridBatchActions({
    moduleKey,
    selectedRowKeys,
    selectedRows,
    listAuditTarget,
    listReverseAuditTarget,
    refreshAndClearSelection,
  })

  const { openFreightSummary } = useBusinessGridFreightActions({
    submittedFilters,
    formatCellValue,
  })

  const { handleStatementGenerate } = useBusinessGridStatementActions({
    refreshModuleQueries,
  })

  return {
    handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx,
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    openFreightSummary,
    handleStatementGenerate,
  }
}
