import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import { useBusinessQueries } from '@/hooks/useBusinessQueries'
import type { SortingState } from '@/hooks/useDataTable'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useExcelExport } from '@/hooks/useExcelExport'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { useModuleFilters } from '@/hooks/useModuleFilters'
import { useModulePageConfig } from '@/hooks/useModulePageConfig'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { getBehaviorValue } from '@/views/modules/module-behavior-registry'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'
import { useBusinessGridOverlays } from '@/views/modules/use-business-grid-overlays'
import { useBusinessGridTable } from '@/views/modules/use-business-grid-table'

interface Props {
  moduleKey: string
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

const EMPTY_CONFIG: ModulePageConfig = {
  key: '',
  title: '',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
}

export function useBusinessGridPage({
  moduleKey,
  pageDef,
  initialConfig,
}: Props) {
  const { config } = useModulePageConfig({ moduleKey, initialConfig })
  const resolvedConfig = config || EMPTY_CONFIG
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
  const listOptionRequirements = useMemo(
    () => resolveMasterOptionRequirements(config?.filters || []),
    [config?.filters],
  )

  useMasterOptions(listOptionRequirements)

  const handlePaginationChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPage)
      setPageSize(nextPageSize)
    },
    [],
  )

  useEffect(() => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
    setPage(1)
    setPageSize(20)
    setSorting([])
  }, [moduleKey])

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
      enabled: canViewRecords,
      sortBy: sorting[0]?.id,
      sortDirection: sorting[0]?.desc ? 'desc' : sorting[0] ? 'asc' : undefined,
    })

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport } = useExcelExport(moduleKey)
  const { detailOpen, detailRecord, detailLoading, openDetail, closeDetail } =
    useDetailSupport({ moduleKey, config: resolvedConfig })
  const {
    editRecord,
    editorLockLoading,
    editorLockRelatedRows,
    editorOpen,
    openEditor,
    closeEditor,
    handleSaved: handleEditorSaved,
  } = useBusinessGridEditor({ moduleKey, config: resolvedConfig })
  const overlays = useBusinessGridOverlays()
  const { getRowClassName } = useModuleRecordHelpers({
    moduleKey,
    config: resolvedConfig,
  })

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
  }, [])

  useEffect(() => {
    const currentPageIds = new Set(records.map((r) => String(r.id)))

    setSelectedRowMap((prev) => {
      const next: Record<string, ModuleRecord> = {}
      for (const key of Object.keys(prev)) {
        if (!currentPageIds.has(key) && selectedRowKeys.includes(key)) {
          next[key] = prev[key]
        }
      }
      for (const record of records) {
        const id = String(record.id)
        if (selectedRowKeys.includes(id)) {
          next[id] = record
        }
      }

      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length !== nextKeys.length) {
        return next
      }

      for (const key of nextKeys) {
        if (prev[key] !== next[key]) {
          return next
        }
      }

      return prev
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

  const formFields = useMemo(
    () => config?.formFields || [],
    [config?.formFields],
  )
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
    currentStatus: editRecord?.status ? asString(editRecord.status) : undefined,
    canEditLineItems: canUpdateRecord,
    canSaveCurrentEditor: canCreateRecord || canUpdateRecord,
    canAuditRecords: canAuditRecord,
    canPrintRecords: canPrintRecord,
    canDeleteRecords: canDeleteRecord,
    isReadOnly: Boolean(config?.readOnly),
    resolveModuleStatusOptions: (statusField) => {
      if (!Array.isArray(statusField?.options)) return []
      return statusField.options
        .map((option) => ('value' in option ? asString(option.value) : ''))
        .filter(Boolean)
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
    config: resolvedConfig,
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
    config: resolvedConfig,
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
      openCustomerStatementGenerator: () => {
        overlays.openCustomerStatement()
      },
      openFreightPickupList: () => {
        overlays.openFreightPickup()
      },
      openFreightStatementGenerator: () => {
        overlays.openFreightStatement()
      },
      openFreightSummary,
      openSupplierStatementGenerator: () => {
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
    moduleKey,
    config,
    records,
    pageSize,
    total,
    canUpdateRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedRowMap,
    buildActions,
    onPaginationChange: handlePaginationChange,
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
