import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import { useBusinessQueries } from '@/hooks/useBusinessQueries'
import type { SortingState } from '@/hooks/useDataTable'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { useModuleExportSupport } from '@/hooks/useModuleExportSupport'
import { useModuleFilters } from '@/hooks/useModuleFilters'
import { useModulePageConfig } from '@/hooks/useModulePageConfig'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import type { ModuleRecord } from '@/types/module-page'
import { getBehaviorValue } from '@/views/modules/module-behavior-registry'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'
import { useBusinessGridOverlays } from '@/views/modules/use-business-grid-overlays'
import { useBusinessGridTable } from '@/views/modules/use-business-grid-table'

interface Props {
  moduleKey: string
  pageDef: AppPageDefinition
}

export function useBusinessGridPage({ moduleKey, pageDef }: Props) {
  const { config } = useModulePageConfig({ moduleKey })
  const {
    canViewRecords,
    canCreateRecord,
    canUpdateRecord,
    canDeleteRecord,
    canExportData,
    canAuditRecord,
    canPrintRecord,
    can,
    resolvedResource,
  } = useModulePermissions({ moduleKey, resourceKey: pageDef.resourceKey })

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<
    Record<string, ModuleRecord>
  >({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([])
  const { formatCellValue } = useModuleDisplaySupport()

  useMasterOptions()

  const {
    filters,
    submittedFilters,
    handleSearch,
    handleReset,
    updateFilter,
    setSubmittedFilters,
  } = useModuleFilters({
    setCurrentPage: (nextPage: number) => setPage(nextPage),
  })

  const { records, total, isLoading, isFetching, warningMessage } =
    useBusinessQueries({
      moduleKey,
      filters: submittedFilters,
      page,
      pageSize,
      enabled: canViewRecords && !!config,
      sortBy: sorting[0]?.id,
      sortDirection: sorting[0]?.desc ? 'desc' : sorting[0] ? 'asc' : undefined,
    })

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport } = useModuleExportSupport(moduleKey)
  const { detailOpen, detailRecord, detailLoading, openDetail, closeDetail } =
    useDetailSupport({ moduleKey, config })
  const {
    editRecord,
    editorLockLoading,
    editorLockRelatedRows,
    editorOpen,
    openEditor,
    closeEditor,
    handleSaved: handleEditorSaved,
  } = useBusinessGridEditor({ moduleKey, config })
  const overlays = useBusinessGridOverlays()
  const { getRowClassName } = useModuleRecordHelpers({ moduleKey, config })

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
  }, [])

  useEffect(() => {
    if (!records.length) {
      return
    }

    setSelectedRowMap((prev) => {
      const next = { ...prev }
      for (const record of records) {
        const id = String(record.id)
        if (selectedRowKeys.includes(id)) {
          next[id] = record
        }
      }
      return next
    })
  }, [records, selectedRowKeys])

  const handleEdit = useCallback(
    (record: ModuleRecord) => {
      void openEditor(record)
    },
    [openEditor],
  )

  const { buildActions } = useModuleRecordActions({
    moduleKey,
    resourceKey: pageDef.resourceKey,
    onEdit: handleEdit,
    onAttach: overlays.openAttachment,
    onRefresh: refreshModuleQueries,
  })

  const lockedLineItemsNotice = useMemo(
    () => String(getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || ''),
    [moduleKey],
  )

  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const {
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    lineItemsLocked: editorLineItemsLocked,
    listAuditTarget,
    listReverseAuditTarget,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: editorLockRelatedRows,
    canEditLineItems: canUpdateRecord,
    canSaveCurrentEditor: canCreateRecord || canUpdateRecord,
    canAuditRecords: canAuditRecord,
    canPrintRecords: canPrintRecord,
    canDeleteRecords: canDeleteRecord,
    isReadOnly: Boolean(config.readOnly),
    resolveModuleStatusOptions: (statusField) => {
      if (!statusField?.options) return []
      return (statusField.options as Array<{ value: string }>).map(
        (option) => option.value,
      )
    },
  })

  const {
    handlePrintSelectedRecords,
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    markSelectedFreightDelivered,
    openFreightSummary,
    handleStatementGenerate,
  } = useBusinessGridActions({
    moduleKey,
    config,
    selectedRowKeys,
    selectedRows: Object.values(selectedRowMap),
    submittedFilters,
    listAuditTarget,
    listReverseAuditTarget,
    refreshModuleQueries,
    clearSelection,
    formatCellValue,
  })

  const { visibleToolbarActions, handleAction } = useModuleToolbarActions({
    moduleKey,
    config,
    formFields,
    isMaterialModule: false,
    selectedRowCount: selectedRowKeys.length,
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    detailPrintLoading: false,
    hasAnyModuleAction: (codes) =>
      codes.some((code) => {
        if (code === 'create') return canCreateRecord
        if (code === 'update') return canUpdateRecord
        if (code === 'delete') return canDeleteRecord
        if (code === 'audit') return canAuditRecord
        if (code === 'export') return canExportData
        if (code === 'print') return canPrintRecord
        if (code === 'manage_permissions') {
          return can(resolvedResource, 'manage_permissions')
        }
        return false
      }),
    handlers: {
      exportMaterialRows: async () => {
        await handleExport()
      },
      exportRows: async () => {
        await handleExport()
      },
      handlePrintSelectedRecords,
      handleSelectedAuditRecords,
      handleSelectedDeleteRecords,
      handleSelectedReverseAuditRecords,
      markSelectedFreightDelivered,
      navigateToRoleActionEditor: () => {
        window.location.href = '/access-control?tab=roles'
      },
      openCreateEditor: async () => {
        await openEditor(null)
      },
      openCustomerStatementGenerator: async () => {
        overlays.openCustomerStatement()
      },
      openFreightPickupList: async () => {
        overlays.openFreightPickup()
      },
      openFreightStatementGenerator: async () => {
        overlays.openFreightStatement()
      },
      openFreightSummary,
      openSupplierStatementGenerator: async () => {
        overlays.openSupplierStatement()
      },
    },
  })

  const {
    columnOrder,
    columnVisibleKeys,
    antdColumns,
    toggleColumn,
    rowSelection,
    onColumnOrderChange,
    onSortingChange,
  } = useBusinessGridTable({
    config,
    records,
    pageSize,
    total,
    canUpdateRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedRowMap,
    buildActions,
    onPaginationChange: (nextPage, nextPageSize) => {
      setPage(nextPage)
      setPageSize(nextPageSize)
    },
    sorting,
    onSortingChange: setSorting,
  })

  return {
    canAuditRecord,
    canCreateRecord,
    canExportData,
    canUpdateRecord,
    canViewRecords,
    clearSelection,
    closeDetail,
    columnVisibleKeys,
    columnOrder,
    onColumnOrderChange,
    onSortingChange,
    config,
    detailLoading,
    detailOpen,
    detailRecord,
    editRecord,
    editorLineItemsLocked,
    editorLockLoading,
    editorOpen,
    exporting,
    filters,
    handleAction,
    handleEditorSaved,
    handleExport,
    handleReset,
    handleSearch,
    handleStatementGenerate,
    isFetching,
    isLoading,
    lockedLineItemsNotice,
    openDetail,
    openEditor,
    overlays,
    page,
    pageSize,
    records,
    refreshModuleQueries,
    rowSelection,
    selectedRowKeys,
    setPage,
    setPageSize,
    setSelectedRowKeys,
    setSubmittedFilters,
    antdColumns,
    toggleColumn,
    total,
    updateFilter,
    visibleToolbarActions,
    warningMessage,
    getRowClassName,
    closeEditor,
  }
}
