import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import { useBusinessGridData } from '@/hooks/useBusinessGridData'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'
import { useBusinessGridTable } from '@/views/modules/use-business-grid-table'

interface Props {
  moduleKey: ModuleKey
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

export function useBusinessGridPage({
  moduleKey,
  pageDef,
  initialConfig,
}: Props) {
  const data = useBusinessGridData({ moduleKey, pageDef, initialConfig })
  const editor = useBusinessGridEditor({
    moduleKey,
    config: data.config,
    resolvedConfig: data.resolvedConfig,
  })
  const actions = useBusinessGridActions({
    moduleKey,
    config: data.config,
    toolbarConfig: data.toolbarConfig,
    selectedRowKeys: data.selectedRowKeys,
    selectedRecords: data.selectedRecords,
    submittedFilters: data.submittedFilters,
    attachmentCounts: data.attachmentCounts,
    canCreateRecord: data.canCreateRecord,
    canUpdateRecord: data.canUpdateRecord,
    canDeleteRecord: data.canDeleteRecord,
    canAuditRecord: data.canAuditRecord,
    canPrintRecord: data.canPrintRecord,
    refreshModuleQueries: data.refreshModuleQueries,
    clearSelection: data.clearSelection,
    handleExport: data.handleExport,
    editRecord: editor.editRecord,
    editorLockRelatedRows: editor.editorLockRelatedRows,
    openEditor: editor.openEditor,
    openAttachment: editor.overlays.openAttachment,
    recordDetailAction: editor.recordDetailAction,
  })
  const {
    columnOrder,
    columnVisibleKeys,
    antdColumns,
    components,
    toggleColumn,
    rowSelection,
    onColumnOrderChange,
    handleColumnResizeReset,
  } = useBusinessGridTable({
    moduleKey,
    config: data.config,
    records: data.records,
    canUpdateRecord: data.canUpdateRecord,
    selectedRowKeys: data.selectedRowKeys,
    setSelectedRowKeys: data.setSelectedRowKeys,
    setSelectedRowMap: data.setSelectedRowMap,
    buildActions: actions.buildActions,
    showActions: false,
    onOpenDetail: editor.openGridDetail,
  })

  return {
    canAuditRecord: data.canAuditRecord,
    canCreateRecord: data.canCreateRecord,
    canExportData: data.canUseListExport,
    canUpdateRecord: data.canUpdateRecord,
    clearSelection: data.clearSelection,
    closeDetail: editor.closeDetail,
    inlineExpandedRowKeys: editor.inlineExpandedRowKeys,
    retryInlineDetail: editor.retryInlineDetail,
    onExpandDetail: editor.handleInlineExpand,
    expandedRowRender: editor.shouldUseInlineDetail
      ? editor.renderInlineDetail
      : undefined,
    columnVisibleKeys,
    columnOrder,
    onColumnOrderChange,
    handleColumnResizeReset,
    config: data.config,
    currentPage: data.currentPage,
    defaultFilters: data.defaultFilters,
    detailItems: editor.detailItems,
    editRecord: editor.editRecord,
    editorSessionKey: editor.editorSessionKey,
    initialParentImportSource: editor.initialParentImportSource,
    initialEditorValues: editor.initialEditorValues,
    editorLineItemsLocked: actions.editorLineItemsLocked,
    editorLockLoading: editor.editorLockLoading,
    editorOpen: editor.editorOpen,
    exporting: data.exporting,
    applyFilters: data.applyGridFilters,
    filters: data.filters,
    handleAction: actions.handleAction,
    handleEditorSaved: editor.handleEditorSaved,
    handleExport: data.handleExport,
    handleReset: data.resetGridFilters,
    handleSearch: data.searchGrid,
    isFetching: data.isFetching,
    isLoading: data.isLoading,
    listErrorMessage: data.listErrorMessage,
    listHasError: data.listHasError,
    lockedLineItemsNotice: actions.lockedLineItemsNotice,
    openDetail: editor.openDetail,
    openEditor: editor.openEditor,
    overlays: editor.overlays,
    records: data.records,
    total: data.total,
    pageSize: data.pageSize,
    setCurrentPage: data.setCurrentPage,
    setPageSize: data.setPageSize,
    refreshModuleQueries: data.refreshModuleQueries,
    retryDetail: editor.retryDetail,
    retryList: data.retryList,
    rowSelection,
    selectedRowKeys: data.selectedRowKeys,
    selectedRows: data.selectedRecords,
    setSelectedRowKeys: data.setSelectedRowKeys,
    setSelectedRowMap: data.setSelectedRowMap,
    setFilters: data.setFilters,
    setSubmittedFilters: data.setSubmittedFilters,
    submittedFilters: data.submittedFilters,
    antdColumns,
    components,
    toggleColumn,
    updateFilter: data.updateFilter,
    visibleToolbarActions: actions.visibleToolbarActions,
    getRowClassName: data.getRowClassName,
    closeEditor: editor.closeEditor,
    canUseBulkPrintActions: actions.canUseBulkPrintActions,
    handlePrintSelectedRecords: actions.handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx: actions.handleExportSalesOrderPrintXlsx,
  }
}
