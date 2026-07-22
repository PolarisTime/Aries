import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchAttachmentCounts,
  updateBusinessModuleStatus,
} from '@/api/business'
import { completeSalesOrder } from '@/api/document-flow-commands'
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
import {
  buildDefaultModuleFilters,
  useModuleFilters,
} from '@/hooks/useModuleFilters'
import { useModulePageConfig } from '@/hooks/useModulePageConfig'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionKind,
  resolveStatusOptions,
} from '@/module-system/module-adapter-actions'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import { resolveModuleRecordCapabilities } from '@/module-system/module-record-capabilities'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
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

function isListExportAction(action: ModuleActionDefinition) {
  return (
    action.key === 'export' ||
    action.key === 'export_balance' ||
    action.label.includes('导出')
  )
}

function withoutListExportActions(config: ModulePageConfig) {
  if (!config.actions?.length) return config
  const actions = config.actions.filter((action) => !isListExportAction(action))
  return actions.length === config.actions.length
    ? config
    : { ...config, actions }
}

export function useBusinessGridPage({
  moduleKey,
  pageDef,
  initialConfig,
}: Props) {
  const { config } = useModulePageConfig({ moduleKey, initialConfig })
  const resolvedConfig = config || EMPTY_CONFIG
  const canCreateRecord = !resolvedConfig.readOnly
  const canUpdateRecord = !resolvedConfig.readOnly
  const canDeleteRecord = !resolvedConfig.readOnly
  const canAuditRecord = !resolvedConfig.readOnly
  const canPrintRecord = true
  const canUseListExport = pageDef.menuParent === 'master'
  const toolbarConfig = canUseListExport
    ? resolvedConfig
    : withoutListExportActions(resolvedConfig)
  const defaultFilters = useMemo(
    () => buildDefaultModuleFilters(config),
    [config],
  )

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<
    Record<string, ModuleRecord>
  >({})
  const [attachmentCounts, setAttachmentCounts] = useState<
    Record<string, number>
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
    applyFilters,
    handleSearch,
    handleReset,
    updateFilter,
    setFilters,
    setSubmittedFilters,
  } = useModuleFilters({
    defaultFilters,
    setCurrentPage: (page: number) => setCurrentPage(page),
  })

  const { records, total, isLoading, isFetching, warningMessage } =
    useInfiniteBusinessItems({
      moduleKey,
      // react-doctor: intentional callback, not event handler
      filters: submittedFilters,
      // react-doctor: intentional callback, not event handler
      enabled: true,
      // react-doctor: intentional callback, not event handler
      currentPage,
      // react-doctor: intentional callback, not event handler
      pageSize,
    })
  const recordIdsKey = records.map((record) => record.id).join(',')

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport: exportModuleRows } =
    useExcelExport(moduleKey)
  const handleExport = async () => {
    if (!canUseListExport) return
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

  useEffect(() => {
    const recordIds = recordIdsKey.split(',').filter(Boolean)
    if (!recordIds.length) {
      setAttachmentCounts({})
      return
    }

    let cancelled = false
    void fetchAttachmentCounts(moduleKey, recordIds)
      .then((response) => {
        if (!cancelled) {
          setAttachmentCounts(response.data?.counts || {})
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttachmentCounts({})
        }
      })

    return () => {
      cancelled = true
    }
  }, [moduleKey, recordIdsKey])

  const clearSelection = () => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
  }
  const applyGridFilters: typeof applyFilters = (nextFilters) => {
    clearSelection()
    applyFilters(nextFilters)
  }
  const searchGrid = () => {
    clearSelection()
    handleSearch()
  }
  const resetGridFilters = () => {
    clearSelection()
    handleReset()
  }

  const navigate = useNavigate()
  const detailRoutePath = getBehaviorValue(moduleKey, 'detailRoutePath')

  const navigateToDetailRoute = (routePath: string, record: ModuleRecord) => {
    const path = routePath.replace(':projectId', String(record.projectId))
    void navigate({ to: path as never })
  }

  const lockedLineItemsNotice = String(
    getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '',
  )
  const shouldUseDetailAction = Boolean(
    detailRoutePath ||
      config?.detailActionLabel ||
      (config?.readOnly && config.detailFields.length > 0),
  )

  const formFields = config?.formFields || []
  const statusFields = [...formFields, ...(config?.filters || [])]
  const {
    canUseBulkAuditAction,
    canUseBulkReverseAuditAction,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    lineItemsLocked: editorLineItemsLocked,
    listAuditActionKind,
    listAuditTarget,
    listReverseAuditActionKind,
    listReverseAuditTarget,
    listAuditSourceStatuses,
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

  const handleSalesOrderStatusChange = async (
    record: ModuleRecord,
    status: string,
  ) => {
    if (moduleKey === 'sales-order' && status === '完成销售') {
      modal.confirm({
        title: '确认完成销售',
        content:
          '完成销售后将按最终交付结果进入结算，请确认销售出库和实际重量已经核定。',
        okText: '完成销售',
        cancelText: '取消',
        maskClosable: false,
        onOk: async () => {
          const response = await completeSalesOrder(String(record.id))
          message.success(response.message || '完成销售成功')
          await refreshModuleQueries()
        },
      })
      return
    }
    const response = await updateBusinessModuleStatus(
      moduleKey,
      String(record.id),
      status,
    )
    message.success(response.message || '销售订单状态已更新')
    await refreshModuleQueries()
  }

  const { buildActions } = useModuleRecordActions({
    moduleKey,
    isReadOnly: Boolean(config?.readOnly),
    attachmentCounts,
    onAttach: overlays.openAttachment,
    detailActionLabel: config?.detailActionLabel,
    onDetail: shouldUseDetailAction
      ? detailRoutePath
        ? (record) => navigateToDetailRoute(detailRoutePath, record)
        : openDetail
      : undefined,
    onEdit: (record) => {
      void openEditor(record)
    },
    canEditRecord: (record) =>
      resolveModuleRecordCapabilities(record, moduleKey).canEdit,
    onStatusChange: (record, status) => {
      void handleSalesOrderStatusChange(record, status)
    },
  })
  const selectedRecords = Object.values(selectedRowMap)
  const canUseSelectedBulkAuditAction =
    canUseBulkAuditAction &&
    selectedRecords.some(
      (record) =>
        !isDeletedModuleRecord(record) &&
        canAuditFromStatus(
          record.status,
          listAuditTarget,
          listReverseAuditTarget,
          listAuditSourceStatuses,
        ),
    )
  const selectedReverseAuditTargets = selectedRecords.flatMap((record) => {
    if (isDeletedModuleRecord(record)) return []
    const targetStatus = resolveReverseAuditTargetForStatus(
      moduleKey,
      record.status,
      listAuditTarget,
      listReverseAuditTarget,
    )
    return targetStatus ? [targetStatus] : []
  })
  const hasSingleReverseAuditTarget = selectedReverseAuditTargets.every(
    (targetStatus) => targetStatus === selectedReverseAuditTargets[0],
  )
  const effectiveListReverseAuditActionKind =
    selectedReverseAuditTargets.length > 0 && hasSingleReverseAuditTarget
      ? resolveStatusChangeActionKind(selectedReverseAuditTargets[0], true)
      : listReverseAuditActionKind
  const canUseSelectedBulkReverseAuditAction =
    canUseBulkReverseAuditAction && selectedReverseAuditTargets.length > 0
  const canUseSelectedBulkDeleteActions =
    canUseBulkDeleteActions &&
    selectedRecords.some(
      (record) => resolveModuleRecordCapabilities(record, moduleKey).canDelete,
    )

  const {
    handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx,
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    openFreightSummary,
    handleStatementGenerate,
  } = useBusinessGridActions({
    moduleKey,
    selectedRowKeys,
    selectedRows: Object.values(selectedRowMap),
    submittedFilters,
    listAuditTarget,
    listReverseAuditTarget,
    listAuditSourceStatuses,
    listAuditActionKind,
    listReverseAuditActionKind: effectiveListReverseAuditActionKind,
    refreshModuleQueries,
    clearSelection,
    formatCellValue,
  })

  const {
    visibleToolbarActions: baseVisibleToolbarActions,
    handleAction: handleToolbarAction,
  } = useModuleToolbarActions({
    moduleKey,
    config: toolbarConfig,
    formFields,
    isMaterialModule: false,
    selectedRowCount: selectedRowKeys.length,
    canUseBulkAuditAction: canUseSelectedBulkAuditAction,
    canUseBulkReverseAuditAction: canUseSelectedBulkReverseAuditAction,
    canUseBulkDeleteActions: canUseSelectedBulkDeleteActions,
    listAuditActionKind,
    listReverseAuditActionKind: effectiveListReverseAuditActionKind,
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
      openCreateEditor: async () => {
        await openEditor(null)
      },
      openCustomerStatementGenerator: () => {
        overlays.openCustomerStatement()
      },
      openFreightPickupList: () => {
        overlays.openFreightPickup(Object.values(selectedRowMap))
      },
      openFreightStatementGenerator: () => {
        overlays.openFreightStatement()
      },
      openFreightSummary,
    },
  })

  const selectedRecordActions =
    selectedRecords.length === 1 ? buildActions(selectedRecords[0]) : []
  const selectedRecordToolbarActions: ModuleActionDefinition[] =
    selectedRecordActions.map((action) => ({
      key: action.key,
      label: action.label,
      type: 'default',
      danger: action.danger,
      disabled: action.disabled,
    }))
  const visibleToolbarActions = [
    ...baseVisibleToolbarActions,
    ...selectedRecordToolbarActions,
  ]
  const handleAction = async (action: ModuleActionDefinition) => {
    const selectedRecordAction = selectedRecordActions.find(
      (candidate) => candidate.key === action.key,
    )
    if (selectedRecordAction) {
      selectedRecordAction.onClick()
      return
    }
    await handleToolbarAction(action)
  }

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
    showActions: false,
  })

  return {
    canAuditRecord,
    canCreateRecord,
    canExportData: canUseListExport,
    canUpdateRecord,
    clearSelection,
    closeDetail,
    columnVisibleKeys,
    columnOrder,
    onColumnOrderChange,
    config,
    currentPage,
    defaultFilters,
    detailLoading,
    detailOpen,
    detailRecord,
    editRecord,
    editorLineItemsLocked,
    editorLockLoading,
    editorOpen,
    exporting,
    applyFilters: applyGridFilters,
    filters,
    handleAction,
    handleEditorSaved,
    handleExport,
    handleReset: resetGridFilters,
    handleSearch: searchGrid,
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
    selectedRows: Object.values(selectedRowMap),
    setSelectedRowKeys,
    setSelectedRowMap,
    setFilters,
    setSubmittedFilters,
    submittedFilters,
    antdColumns,
    toggleColumn,
    updateFilter,
    visibleToolbarActions,
    warningMessage,
    getRowClassName,
    closeEditor,
    canUseBulkPrintActions,
    handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx,
  }
}
