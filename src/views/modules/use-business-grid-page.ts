import { useMemo } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import { useBusinessGridData } from '@/hooks/useBusinessGridData'
import { isSelectionScopedToolbarAction } from '@/hooks/useModuleToolbarActions'
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
  /*
   * 勾选后才可用的批量动作：横幅与行右键菜单共用这一份（判据同样只有一处）。
   */
  const selectionScopedActions = useMemo(
    () => actions.visibleToolbarActions.filter(isSelectionScopedToolbarAction),
    [actions.visibleToolbarActions],
  )
  const {
    columnOrder,
    columnVisibleKeys,
    antdColumns,
    components,
    rowContextMenus,
    toggleColumn,
    rowSelection,
    renderRowDetailToggle,
    onColumnOrderChange,
    handleColumnResizeReset,
  } = useBusinessGridTable({
    moduleKey,
    config: data.config,
    records: data.records,
    selectedRowKeys: data.selectedRowKeys,
    setSelectedRowKeys: data.setSelectedRowKeys,
    setSelectedRowMap: data.setSelectedRowMap,
    buildActions: actions.buildActions,
    /*
     * 行右键菜单里的批量动作与「已选择 N 项」横幅共用同一份动作定义与同一个处理函数：
     * 筛选口径（isSelectionScopedToolbarAction）也只有一处，避免"横幅里有、右键里没有"。
     */
    batchActions: selectionScopedActions,
    // handleAction 是 async；菜单点击不需要等待结果，显式丢弃 Promise 满足 void 契约
    onBatchAction: (action) => {
      void actions.handleAction(action)
    },
    onOpenDetail: editor.openGridDetail,
    expandedRowKeys: editor.shouldUseInlineDetail
      ? editor.inlineExpandedRowKeys
      : undefined,
    detailVariant: editor.shouldUseInlineDetail ? 'expand' : 'preview',
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
    renderRowDetailToggle,
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
    isRetrying: data.isRetrying,
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
    rowContextMenus,
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
