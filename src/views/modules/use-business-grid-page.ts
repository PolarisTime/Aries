import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useExcelExport } from '@/hooks/useExcelExport'
import { useInfiniteBusinessItems } from '@/hooks/useInfiniteBusinessItems'
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
import { resolveStatusOptions } from '@/module-system/module-adapter-actions'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
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
    // react-doctor: intentional callback, not event handler
  } = useModulePermissions({ moduleKey, resourceKey: pageDef.resourceKey })

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<
    Record<string, ModuleRecord>
  >({})
  const [currentPage, setCurrentPage] = useState(1)
  const defaultPageSize = useDefaultPageSize()
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const { formatCellValue } = useModuleDisplaySupport()
  const listOptionRequirements = resolveMasterOptionRequirements(
    config?.filters || [],
  )

  useMasterOptions(listOptionRequirements)

  const {
    filters,
    submittedFilters,
    handleSearch,
    handleReset,
    updateFilter,
    setSubmittedFilters,
  } = useModuleFilters({
    setCurrentPage: (page: number) => setCurrentPage(page),
  })

  const { records, total, isLoading, isFetching, warningMessage } =
    useInfiniteBusinessItems({
      moduleKey,
      // react-doctor: intentional callback, not event handler
      filters: submittedFilters,
      // react-doctor: intentional callback, not event handler
      enabled: canViewRecords,
      // react-doctor: intentional callback, not event handler
      currentPage,
      // react-doctor: intentional callback, not event handler
      pageSize,
    })

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport: exportModuleRows } = useExcelExport(moduleKey)
  const handleExport = async () => {
    await exportModuleRows(submittedFilters)
  }
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

  const clearSelection = () => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
  }

  const navigate = useNavigate()
  const detailRoutePath = getBehaviorValue(moduleKey, 'detailRoutePath')

  const handleEdit = (record: ModuleRecord) => {
    void openEditor(record)
  }

  const handleDetail = (record: ModuleRecord) => {
    if (detailRoutePath) {
      const path = detailRoutePath.replace(
        ':projectId',
        String(record.projectId),
      )
      void navigate({ to: path as never })
    }
  }

  const lockedLineItemsNotice = String(
    getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '',
  )

  const formFields = config?.formFields || []
  const statusFields = [...formFields, ...(config?.filters || [])]
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
    listStatusFields: statusFields,
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
      return resolveStatusOptions({ fields: [statusField] })
    },
  })

  const { buildActions } = useModuleRecordActions({
    moduleKey,
    resourceKey: pageDef.resourceKey,
    isReadOnly: Boolean(config?.readOnly),
    onEdit: handleEdit,
    onAttach: overlays.openAttachment,
    onDetail:
      detailRoutePath || moduleKey === 'receivable-payable'
        ? detailRoutePath
          ? handleDetail
          : openDetail
        : undefined,
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
        const selected = records.filter((r) =>
          selectedRowKeys.includes(String(r.id)),
        )
        overlays.openFreightPickup(selected)
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
  } = useBusinessGridTable({
    moduleKey,
    config,
    records,
    canUpdateRecord,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedRowMap,
    buildActions,
    showActions: true,
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
    config,
    currentPage,
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
    records,
    total,
    pageSize,
    setCurrentPage,
    setPageSize,
    refreshModuleQueries,
    rowSelection,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedRowMap,
    setSubmittedFilters,
    antdColumns,
    toggleColumn,
    updateFilter,
    visibleToolbarActions,
    warningMessage,
    getRowClassName,
    closeEditor,
    canUseBulkPrintActions,
    handlePrintSelectedRecords,
  }
}
