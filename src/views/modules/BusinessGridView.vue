<script setup lang="ts">
/**
 * BusinessGridView — unified CRUD view for 20+ business modules.
 *
 * DECOMPOSITION ROADMAP (in order of impact):
 *  1. Extract editor workspace → ModuleEditorWorkspace.vue (done)
 *  2. Extract filter toolbar → ModuleFilterToolbar.vue (done)
 *  3. Extract editor form field renderer → FormFieldRenderer.vue (done)
 *  4. Extract list panel → ModuleGridPanel.vue (done)
 *  5. Extract overlay composition → ModuleGridOverlays.vue (done)
 *  6. Extract page config/filter state → useModulePageConfig/useModuleFilters (done)
 *  7. Extract record actions/export support → useModuleRecordActions/useModuleExportSupport (done)
 *  8. Extract grid table state → useModuleGridTable (done)
 *  9. Extract toolbar/editor capabilities/permissions → dedicated composables (done)
 * 10. Extract visible fields/columns and attachment feature gates → useModuleVisibleFields (done)
 * 11. Extract page reset/route auto-open lifecycle → useModulePageLifecycle (done)
 * 12. Extract editor entry and field/item edit bindings → useModuleEditorEntry (done)
 * 13. Extract table error event wiring → useModuleTableErrors (done)
 * 14. Extract record identity/format helpers → useModuleRecordHelpers (done)
 * 15. Extract basic view derived state → useModuleViewState (done)
 * 16. Extract query refresh and parent import detail fetch → dedicated composables (done)
 * 17. Extract statement generator/editor draft bridge → useModuleStatementEditorBridge (done)
 * 18. Extract editor item selection state → useModuleEditorItemSelection (done)
 * 19. Extract editor template event adapters → useModuleEditorEvents (done)
 * 20. Extract material export action wrapper → useModuleMaterialExportAction (done)
 * 21. Move remaining selected/audit derived state into owning composables (done)
 * 22. Extract list summary/upload-rule row state → useModuleListState (done)
 * 23. Extract grid panel template bindings → useModuleGridPanelBindings (done)
 * 24. Extract editor workspace template bindings → useModuleEditorWorkspaceBindings (done)
 * 25. Replace module-specific adapters with ModuleBehaviorRegistry calls.
 *     - Done for editor adapter; remaining: statements, finance-links, parent-import.
 */
import { computed, reactive, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isSuccessCode } from '@/api/client'
import { showRequestError } from '@/composables/use-request-error'
import ModuleEditorWorkspace from './components/ModuleEditorWorkspace.vue'
import ModuleGridOverlays from './components/ModuleGridOverlays.vue'
import ModuleGridPanel from './components/ModuleGridPanel.vue'
import {
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
} from './module-adapter-editor'
import { useModuleEditorCapabilities } from './use-module-editor-capabilities'
import { useModuleEditorEntry } from './use-module-editor-entry'
import { useModuleEditorEvents } from './use-module-editor-events'
import { useModuleEditorItemSelection } from './use-module-editor-item-selection'
import { useModuleEditorWorkspaceBindings } from './use-module-editor-workspace-bindings'
import { useModuleExportSupport } from './use-module-export-support'
import { useModuleFilters } from './use-module-filters'
import { useModuleGridPanelBindings } from './use-module-grid-panel-bindings'
import { useModuleGridRowRenderers } from './use-module-grid-row-renderers'
import { useModuleGridTable } from './use-module-grid-table'
import { useModuleListState } from './use-module-list-state'
import { useModuleMaterialExportAction } from './use-module-material-export-action'
import { useModulePageConfig } from './use-module-page-config'
import { useModulePageLifecycle } from './use-module-page-lifecycle'
import { useModuleParentImportDetail } from './use-module-parent-import-detail'
import { useModulePermissions } from './use-module-permissions'
import { useModuleQueryRefresh } from './use-module-query-refresh'
import { useModuleRecordActions } from './use-module-record-actions'
import { useModuleRecordHelpers } from './use-module-record-helpers'
import { useModuleTableErrors } from './use-module-table-errors'
import { useModuleStatementEditorBridge } from './use-module-statement-editor-bridge'
import { useModuleToolbarActions } from './use-module-toolbar-actions'
import { useModuleViewState } from './use-module-view-state'
import { useModuleVisibleFields } from './use-module-visible-fields'
import { useStatementGeneratorSupport } from './use-statement-generator-support'
import { useSystemModuleSupport } from './use-system-module-support'
import { useUploadRuleSupport } from './use-upload-rule-support'
import { useModuleDisplaySupport } from '@/composables/use-module-display-support'
import { useAttachmentSupport } from '@/composables/use-attachment-support'
import { useColumnSettingsSupport } from '@/composables/use-column-settings-support'
import { useDetailSupport } from '@/composables/use-detail-support'
import { useEditorItemSupport } from './use-editor-item-support'
import { useEditorFormSupport } from './use-editor-form-support'
import { useBusinessQueries } from './use-business-queries'
import { useInvoiceSync } from './use-invoice-sync'
import { useFinanceAllocationSync } from './use-finance-allocation-sync'
import { useMaterialImport } from './use-material-import'
import { useFinanceStatementLinkSupport } from './use-finance-statement-link-support'
import { useFreightPickupList } from './use-freight-pickup-list'
import { useMaterialSelector } from './use-material-selector'
import { getBehaviorValue } from './module-behavior-registry'
import { useParentImportSupport } from './use-parent-import-support'
import { cloneLineItems } from '@/utils/clone-utils'
import { resolveStatusChangeActionLabel } from './module-adapter-actions'
import type { ModuleRecord } from '@/types/module-page'

const props = defineProps<{
  moduleKey: string
}>()
const route = useRoute()
const router = useRouter()

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
})
const { refreshModuleQueries } = useModuleQueryRefresh(computed(() => props.moduleKey))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSaving = ref(false)
const editorForm = reactive<Record<string, unknown>>({})
const editorSourceRecordId = ref('')
const materialSelectorKeyword = ref('')
const materialSelectorCurrentPage = ref(1)
const materialSelectorPageSize = ref(20)
const parentSelectorKeyword = ref('')
const parentSelectorCurrentPage = ref(1)
const parentSelectorPageSize = ref(20)

const {
  clientSettingsReady,
  config,
  defaultPageSize,
  readOnlyAlertActionLink,
  showSnowflakeId,
  supportsInvoiceAssist,
} = useModulePageConfig(computed(() => props.moduleKey))

const hasAppliedConfiguredPageSize = ref(false)

watch(
  [clientSettingsReady, defaultPageSize],
  ([ready, value]) => {
    if (!ready || hasAppliedConfiguredPageSize.value) {
      return
    }
    pagination.pageSize = value
    materialSelectorPageSize.value = value
    parentSelectorPageSize.value = value
    hasAppliedConfiguredPageSize.value = true
  },
  { immediate: true },
)
const {
  activeQuickFilterKey,
  applyKeywordFilter,
  applyQuickFilter,
  filters,
  handleFilterValueChange,
  handleSearch,
  hasAdvancedFilters,
  quickFilters,
  resetFilters,
  resolveModuleStatusOptions,
  searchExpanded,
  setFilterValue,
  submittedFilters,
  visibleFilters,
} = useModuleFilters({
  config,
  setCurrentPage: (value) => {
    pagination.currentPage = value
  },
})
const {
  canAuditRecords,
  canCreateRecords,
  canDeleteRecords,
  canEditRecords,
  canExportRecords,
  canPrintRecords,
  canViewModuleRecords,
  canViewRecords,
  hasAnyModuleAction,
} = useModulePermissions(computed(() => props.moduleKey))
const {
  generatePrimaryNo,
  generatePrimaryNoAsync,
  getCurrentOperatorName,
  getPrimaryNo,
  getRowClassName,
  sumLineItemsBy,
} = useModuleRecordHelpers({
  moduleKey: computed(() => props.moduleKey),
  config,
})
const {
  canEditFormFields,
  canEditItemColumns,
  canEditLineItems,
  canImportMaterials,
  canSaveCurrentEditor,
  editorItemAmountTotal,
  editorItems,
  editorItemWeightTotal,
  editorTitle,
  formFields,
  itemAmountSummaryKey,
  itemWeightSummaryKey,
  isMaterialModule,
  isReadOnly,
  parentImportConfig,
  shouldShowItemAmountSummary,
  shouldShowItemWeightSummary,
  statusMap,
} = useModuleViewState({
  moduleKey: computed(() => props.moduleKey),
  config,
  editorMode,
  editorForm,
  canCreateRecords,
  canEditRecords,
  sumLineItemsBy,
})
const { fetchParentImportDetail } = useModuleParentImportDetail({
  parentImportConfig,
  isSuccessCode,
})

const {
  createEditorBaseDraft,
  openCreateEditorWithDraft,
} = useModuleStatementEditorBridge({
  editorForm,
  editorMode,
  editorVisible,
  editorSourceRecordId,
  resetParentImportState: () => resetParentImportState(),
  buildEditorDraft: (mode, sourceRecord) => buildEditorDraft(mode, sourceRecord),
})

const {
  checkedRoleNames,
  handleRoleTreeCheck,
  isRoleTreeField,
  roleTreeData,
  selectedRolePermissionLabels,
  syncEditorState: syncSystemEditorState,
  systemHelperTitle,
  systemHelperVisible,
} = useSystemModuleSupport({
  moduleKey: computed(() => props.moduleKey),
  editorVisible,
  editorForm,
  canViewModuleRecords: (moduleKey) => canViewModuleRecords(moduleKey),
})

const {
  closeCustomerStatementGenerator,
  closeFreightStatementGenerator,
  closeSupplierStatementGenerator,
  customerStatementCandidateRows,
  customerStatementCurrentPage,
  customerStatementGeneratorLoading,
  customerStatementGeneratorVisible,
  customerStatementKeyword,
  customerStatementPageSize,
  customerStatementRowSelection,
  customerStatementSelectedCustomerName,
  customerStatementSelectedOrders,
  customerStatementSelectedProjectName,
  customerStatementTotal,
  freightStatementCandidateRows,
  freightStatementCurrentPage,
  freightStatementGeneratorLoading,
  freightStatementGeneratorVisible,
  freightStatementKeyword,
  freightStatementPageSize,
  freightStatementRowSelection,
  freightStatementSelectedBills,
  freightStatementSelectedCarrierName,
  freightStatementTotal,
  freightSummaryLoading,
  freightSummaryRows,
  freightSummaryVisible,
  handleGenerateCustomerStatement,
  handleGenerateFreightStatement,
  handleGenerateSupplierStatement,
  openCustomerStatementGenerator,
  openFreightStatementGenerator,
  openFreightSummary,
  openSupplierStatementGenerator,
  resetStatementSupportState,
  supplierStatementCandidateRows,
  supplierStatementCurrentPage,
  supplierStatementGeneratorLoading,
  supplierStatementGeneratorVisible,
  supplierStatementKeyword,
  supplierStatementPageSize,
  supplierStatementRowSelection,
  supplierStatementSelectedInbounds,
  supplierStatementSelectedSupplierName,
  supplierStatementTotal,
  updateCustomerStatementCurrentPage,
  updateCustomerStatementKeyword,
  updateCustomerStatementPageSize,
  updateFreightStatementCurrentPage,
  updateFreightStatementKeyword,
  updateFreightStatementPageSize,
  updateSupplierStatementCurrentPage,
  updateSupplierStatementKeyword,
  updateSupplierStatementPageSize,
} = useStatementGeneratorSupport({
  canViewRecords,
  moduleKey: computed(() => props.moduleKey),
  submittedFilters,
  defaultPageSize,
  createBaseDraft: createEditorBaseDraft,
  openEditorWithDraft: (draft) => {
    openCreateEditorWithDraft(draft)
  },
  showRequestError,
})

const {
  attachmentFeatureEnabled,
  handleUploadRuleRecordEdit,
  handleUploadRuleRecordView,
  resetUploadRuleState,
  uploadRuleGridRowRenderers,
  uploadRuleGridTableHooks,
  uploadRuleRecordActionGuards,
} = useUploadRuleSupport({
  moduleKey: computed(() => props.moduleKey),
  canEditRecords,
  canViewRecords,
  isReadOnly,
  isSuccessCode,
  refreshModuleQueries,
  showRequestError,
})

const {
  listQuery,
  parentListQuery,
  materialListQuery,
  customerStatementRowsQuery,
  supplierStatementRowsQuery,
  freightStatementRowsQuery,
  listResult,
  parentRows,
  parentRowTotal,
  moduleRows,
  materialRows,
  materialSelectorRows,
  materialRowTotal,
  warehouseRows,
  departmentRows,
  customerStatementRows,
  supplierStatementRows,
  freightStatementRows,
  lineItemLockRelatedRows,
  materialMap,
  currentInvoiceTaxRate,
} = useBusinessQueries({
  moduleKey: computed(() => props.moduleKey),
  submittedFilters,
  paginationCurrentPage: computed(() => pagination.currentPage),
  paginationPageSize: computed(() => pagination.pageSize),
  canViewRecords,
  canEditLineItems,
  editorVisible,
  editorForm,
  supportsInvoiceAssist,
  parentImportConfig,
  canViewModuleRecords: (moduleKey) => canViewModuleRecords(moduleKey),
  materialSelectorKeyword,
  materialSelectorCurrentPage,
  materialSelectorPageSize,
  parentSelectorKeyword,
  parentSelectorCurrentPage,
  parentSelectorPageSize,
})

const {
  columnSettingItems,
  editorColumnSettingItems,
  formFieldSettingItems,
  getColumnSettingItemClass,
  getEditorColumnSettingItemClass,
  getFormFieldSettingItemClass,
  handleColumnSettingDragOver,
  handleColumnSettingDragStart,
  handleColumnSettingDrop,
  handleColumnVisibleChange,
  handleEditorColumnSettingDragOver,
  handleEditorColumnSettingDragStart,
  handleEditorColumnSettingDrop,
  handleEditorColumnVisibleChange,
  handleFormFieldSettingDragOver,
  handleFormFieldSettingDragStart,
  handleFormFieldSettingDrop,
  handleFormFieldVisibleChange,
  initColumnSettings,
  initEditorColumnSettings,
  initFormFieldSettings,
  resetColumnSettings,
  resetEditorColumnSettings,
  resetEditorColumnSettingDragState,
  resetFormFieldSettingDragState,
  resetFormFieldSettings,
  resetListColumnSettingDragState,
} = useColumnSettingsSupport({
  moduleKey: computed(() => props.moduleKey),
  config,
  formFields,
})

const { masterTableSummary } = useModuleListState(computed(() => listResult.value.total))

const {
  formatAmount,
  formatCellValue,
  formatWeight,
  getStatusMeta,
} = useModuleDisplaySupport(statusMap)

const {
  canManageAttachments,
  columnMetaMap,
  visibleConfigColumns,
  visibleFormFields,
} = useModuleVisibleFields({
  moduleKey: computed(() => props.moduleKey),
  config,
  formFields,
  warehouseRows,
  departmentRows,
  editorForm,
  showSnowflakeId,
  columnSettingItems,
  formFieldSettingItems,
  attachmentFeatureEnabled,
  canEditRecords,
  resolveSourceStatementField: (field) => resolveSourceStatementField(field),
})

const {
  detailTableColumns,
  detailTableScroll,
  editorDetailTableColumns,
  editorDetailTableScroll,
  expandable,
  expandedDetailRecordMap,
  freightSummaryColumns,
  getExpandedDetailItems,
  isExpandedDetailLoading,
  mainTable,
  materialSelectorColumns,
  resetGridTableState,
  selectedRowCount,
  selectedRowKeys,
  selectedRowMap,
} = useModuleGridTable({
  moduleKey: computed(() => props.moduleKey),
  config,
  listRows: computed(() => listResult.value.rows),
  canViewRecords,
  canEditItemColumns,
  isReadOnly,
  visibleConfigColumns,
  columnMetaMap,
  editorColumnSettingItems,
  formatCellValue,
  getStatusMeta,
  ...uploadRuleGridTableHooks,
  isSuccessCode,
  showRequestError,
})

const {
  exportLoading,
  exportMenuItems,
  exportRows,
  handleExportMenuClick,
} = useModuleExportSupport({
  moduleKey: computed(() => props.moduleKey),
  config,
  visibleConfigColumns,
  listRows: computed(() => listResult.value.rows),
  listTotal: computed(() => listResult.value.total),
  selectedRowKeys,
  selectedRowMap,
  submittedFilters,
  canExportRecords,
  formatCellValue,
  getStatusText: (value) => getStatusMeta(value).text,
})

const { clearTableError, tableErrorMessage } = useModuleTableErrors()

const {
  paymentBusinessType,
  resolveSourceStatementField,
  sourceStatementOptions,
  sourceStatementOptionsReady,
} = useFinanceStatementLinkSupport({
  moduleKey: computed(() => props.moduleKey),
  editorVisible,
  editorForm,
  customerStatementRows,
  supplierStatementRows,
  freightStatementRows,
  customerStatementRowsFetched: customerStatementRowsQuery.isFetched,
  supplierStatementRowsFetched: supplierStatementRowsQuery.isFetched,
  freightStatementRowsFetched: freightStatementRowsQuery.isFetched,
})

const {
  canAddManualEditorItems,
  canManageEditorItems,
  canSaveAndAuditCurrentEditor,
  canUseBulkAuditActions,
  canUseBulkDeleteActions,
  canUseBulkPrintActions,
  editorAuditTarget,
  lineItemsLocked,
  listAuditTarget,
  listReverseAuditTarget,
  listStatusOptions,
  lockedLineItemsNotice,
} = useModuleEditorCapabilities({
  moduleKey: computed(() => props.moduleKey),
  formFields,
  lineItemLockRelatedRows,
  canEditLineItems,
  canSaveCurrentEditor,
  canAuditRecords,
  canPrintRecords,
  canDeleteRecords,
  isReadOnly,
  resolveModuleStatusOptions,
})

useInvoiceSync({
  moduleKey: computed(() => props.moduleKey),
  editorVisible,
  editorForm,
  editorItems,
  currentInvoiceTaxRate,
  customerStatementRows,
  supplierStatementRows,
  freightStatementRows,
  paymentBusinessType,
  sourceStatementOptions,
  sourceStatementOptionsReady,
})

useFinanceAllocationSync({
  moduleKey: computed(() => props.moduleKey),
  editorVisible,
  editorForm,
  editorItems,
  customerStatementRows,
  supplierStatementRows,
  freightStatementRows,
  paymentBusinessType,
})

const {
  materialImportVisible,
  materialImportLoading,
  materialImportFile,
  materialImportResultVisible,
  materialImportResult,
  closeMaterialImportModal,
  closeMaterialImportResultModal,
  handleMaterialImportClick,
  handleMaterialTemplateDownload,
  handleMaterialImportBeforeUpload,
  handleMaterialImportSubmit,
  exportMaterialRows,
} = useMaterialImport({
  moduleKey: computed(() => props.moduleKey),
  isMaterialModule,
  canImportMaterials,
  canExportRecords,
  isSuccessCode,
  refreshModuleQueries,
})

const {
  freightPickupListVisible,
  freightPickupListLoading,
  freightPickupListRows,
  freightPickupListSelectedBills,
  freightPickupListCarrierNames,
  freightPickupListBillNos,
  freightPickupListTotalWeight,
  closeFreightPickupList,
  openFreightPickupList,
  markSelectedFreightDelivered,
} = useFreightPickupList({
  moduleKey: computed(() => props.moduleKey),
  canExportRecords,
  canAuditRecords,
  selectedRowKeys: selectedRowKeys as Ref<Array<string | number>>,
  selectedRowMap,
  isSuccessCode,
  showRequestError,
  refreshModuleQueries,
})

const {
  closeParentSelector,
  getParentImportableQuantity,
  getParentOptionLabel,
  getParentRelationNo,
  getParentSelectorRowProps,
  handleImportParentItems,
  occupiedParentMap,
  openParentSelector,
  parentAvailabilityLoading,
  parentImportableQuantityVisible,
  parentSelectorRowSelection,
  parentSelectorRows,
  parentSelectorVisible,
  resetParentImportState,
} = useParentImportSupport({
  editorForm,
  editorItems,
  editorSourceRecordId,
  editorVisible,
  parentImportConfig,
  parentRows,
  moduleRows,
  cloneLineItems,
  fetchParentDetail: fetchParentImportDetail,
  parentSelectorKeyword,
  parentSelectorCurrentPage,
  parentSelectorPageSize,
  parentSelectorDefaultPageSize: defaultPageSize,
})

function handleParentSelectorKeywordChange(value: string) {
  parentSelectorKeyword.value = value
  parentSelectorCurrentPage.value = 1
}

function handleParentSelectorPageChange(value: number) {
  parentSelectorCurrentPage.value = value
}

function handleParentSelectorPageSizeChange(value: number) {
  parentSelectorPageSize.value = value
  parentSelectorCurrentPage.value = 1
}

function handleMaterialSelectorPageChange(value: number) {
  if (materialSelectorCurrentPage.value === value) {
    return
  }
  materialSelectorCurrentPage.value = value
}

function handleMaterialSelectorPageSizeChange(value: number) {
  if (materialSelectorPageSize.value === value) {
    return
  }
  materialSelectorPageSize.value = value
  materialSelectorCurrentPage.value = 1
}

const {
  activeRecord,
  detailPrintLoading,
  detailVisible,
  handleCloseDetail,
  handlePrintDetail,
  handleView,
  printRecords,
  resolveRecordById,
  resolveRecordForDetail,
} = useDetailSupport({
  moduleKey: computed(() => props.moduleKey),
  config,
  statusMap,
  canViewRecords,
  canPrintRecords,
  handleCustomViewRecord: handleUploadRuleRecordView,
  isSuccessCode,
  showRequestError,
  getPrimaryNo,
})

const {
  addEditorItem,
  filterMaterialOption,
  getEditorItemRowClassName,
  getEditorItemRowProps,
  handleEditorItemDragEnd,
  handleEditorItemDragStart,
  handleEditorItemInputChange,
  handleEditorItemMaterialSelect,
  handleEditorItemNumberChange,
  handleEditorItemValueChange,
  removeEditorItem,
} = useEditorItemSupport({
  editorForm,
  editorItems,
  materialMap,
  canManageEditorItems,
})

const {
  removeSelectedEditorItems,
  selectedEditorItemIds,
} = useModuleEditorItemSelection(removeEditorItem)

const {
  materialSelectorVisible,
  materialSelectorSelectedCode,
  activeMaterialSelectorItem,
  materialSelectorRowSelection,
  openMaterialSelector,
  closeMaterialSelector,
  confirmMaterialSelector,
  updateMaterialSelectorKeyword,
  getMaterialSelectorRowProps,
} = useMaterialSelector({
  editorItems,
  materialSelectorKeyword,
  materialSelectorCurrentPage,
  handleEditorItemMaterialSelect,
})

const {
  buildEditorDraft,
  closeEditor,
  getEditorDateValue,
  handleEditorDateChange,
  handleSaveEditor,
  openCreateEditor,
} = useEditorFormSupport({
  moduleKey: computed(() => props.moduleKey),
  config,
  formFields,
  parentImportConfig,
  occupiedParentMap,
  editorSession: {
    editorForm,
    editorMode,
    editorVisible,
    editorSaving,
    editorSourceRecordId,
    setMode: (mode) => { editorMode.value = mode },
    setSaving: (value) => { editorSaving.value = value },
    setVisible: (value) => { editorVisible.value = value },
    setSourceRecordId: (value) => { editorSourceRecordId.value = value },
  },
  editorItems,
  canCreateRecords,
  canSaveCurrentEditor,
  canAuditRecords,
  isReadOnly,
  editorAuditTarget,
  getCurrentOperatorName,
  getPrimaryNo,
  generatePrimaryNo,
  generatePrimaryNoAsync,
  sumLineItemsBy,
  resetParentImportState,
  syncSystemEditorState,
  refreshModuleQueries,
  showRequestError,
  isSuccessCode,
  setPaginationCurrentPage: (value) => {
    pagination.currentPage = value
  },
})

const { handleReset } = useModulePageLifecycle({
  moduleKey: computed(() => props.moduleKey),
  routeDocNo: computed(() => route.query.docNo),
  routeTrackId: computed(() => route.query.trackId ?? route.query.trackid),
  routeOpenDetail: computed(() => route.query.openDetail),
  listRows: computed(() => listResult.value.rows),
  selectedRowKeys,
  selectedRowMap,
  detailVisible,
  activeRecord,
  resetFilters,
  setPaginationCurrentPage: (value) => {
    pagination.currentPage = value
  },
  resetGridTableState,
  closeFreightPickupList,
  resetStatementSupportState,
  closeMaterialImportModal,
  resetUploadRuleState,
  closeEditor,
  initColumnSettings,
  initFormFieldSettings,
  initEditorColumnSettings,
  applyKeywordFilter,
  getPrimaryNo,
  fetchRecordById: resolveRecordById,
  handleView,
})

const {
  handleEdit,
  isEditorFieldDisabled,
  isEditorItemColumnEditable,
  setEditorFormValue,
} = useModuleEditorEntry({
  moduleKey: computed(() => props.moduleKey),
  editorForm,
  editorMode,
  editorVisible,
  editorSourceRecordId,
  formFields,
  canEditRecords,
  canSaveCurrentEditor,
  canEditLineItems,
  lineItemsLocked,
  isReadOnly,
  handleCustomEditRecord: handleUploadRuleRecordEdit,
  handleView,
  resolveRecordForDetail,
  resetParentImportState,
  buildEditorDraft,
  syncSystemEditorState,
})

const {
  attachmentDraftName,
  attachmentPasteEnabled,
  attachmentRecord,
  attachmentRows,
  attachmentSaving,
  attachmentVisible,
  closeAttachmentDialog,
  handleAddAttachment,
  handleAttachmentBeforeUpload,
  handleDownloadAttachment,
  handlePreviewAttachment,
  handleRemoveAttachment,
  openAttachmentDialog,
} = useAttachmentSupport({
  activeRecord,
  canManageAttachments,
  isReadOnly,
  isSuccessCode,
  getCurrentOperatorName,
  moduleKey: computed(() => props.moduleKey),
  showRequestError,
})

const {
  canDeleteRecord,
  canEditRecord,
  canAuditRecord,
  handleAuditRecord,
  handleDelete,
  handlePrintSelectedRecords,
  canReverseAuditRecord,
  handleReverseAuditRecord,
  handleSelectedAuditRecords,
  handleSelectedDeleteRecords,
  handleSelectedReverseAuditRecords,
} = useModuleRecordActions({
  moduleKey: computed(() => props.moduleKey),
  selectedRowKeys,
  selectedRowMap,
  expandedDetailRecordMap,
  activeRecord,
  attachmentRecord,
  isReadOnly,
  canEditRecords,
  canDeleteRecords,
  canAuditRecords,
  canUseBulkDeleteActions,
  listAuditTarget,
  listReverseAuditTarget,
  listStatusOptions,
  ...uploadRuleRecordActionGuards,
  getPrimaryNo,
  handleCloseDetail,
  closeAttachmentDialog,
  printRecords,
  refreshModuleQueries,
  isSuccessCode,
  showRequestError,
})

const listAuditActionLabel = computed(() =>
  resolveStatusChangeActionLabel(listAuditTarget.value?.value),
)
const listReverseAuditActionLabel = computed(() =>
  resolveStatusChangeActionLabel(listReverseAuditTarget.value?.value, true),
)

const listRowActionKeys = computed(() => {
  const actionKeys = getBehaviorValue(props.moduleKey, 'listRowActionKeys')
  return Array.isArray(actionKeys) ? actionKeys : ['attachment']
})

function getGridRowProps(record: ModuleRecord) {
  if (uploadRuleGridRowRenderers.isCustomGridRow?.(record)) {
    return {}
  }
  if (getBehaviorValue(props.moduleKey, 'openDetailOnRowDoubleClick') === false) {
    return {}
  }
  return {
    onDblclick: () => {
      if (canEditRecord(record)) {
        void handleEdit(record)
        return
      }
      if (!canViewRecords.value) {
        return
      }
      void handleView(record)
    },
  }
}

const {
  expandedRowRenderer,
  rowActionsRenderer,
} = useModuleGridRowRenderers({
  isReadOnly,
  canViewRecords,
  canEditRecord,
  canManageAttachments,
  visibleActionKeys: listRowActionKeys,
  canAuditRecord,
  canReverseAuditRecord,
  auditActionLabel: listAuditActionLabel,
  reverseAuditActionLabel: listReverseAuditActionLabel,
  canDeleteRecord,
  ...uploadRuleGridRowRenderers,
  itemColumns: computed(() => config.value.itemColumns),
  isExpandedDetailLoading,
  getExpandedDetailItems,
  detailTableColumns,
  detailTableScroll,
  formatCellValue,
  getStatusMeta,
  handleView,
  handleEdit,
  handleAuditRecord,
  handleReverseAuditRecord,
  handleDelete,
  openAttachmentDialog,
})

const {
  handleEditorDateValueChange,
  handleRoleTreeCheckChange,
} = useModuleEditorEvents({
  handleRoleTreeCheck,
  handleEditorDateChange,
})

const { handleExportMaterialRows } = useModuleMaterialExportAction({
  exportLoading,
  submittedFilters,
  moduleTitle: computed(() => config.value.title),
  exportMaterialRows,
})

const {
  handleAction,
  visibleToolbarActions,
} = useModuleToolbarActions({
  moduleKey: computed(() => props.moduleKey),
  config,
  formFields,
  isMaterialModule,
  selectedRowCount,
  auditActionLabel: listAuditActionLabel,
  reverseAuditActionLabel: listReverseAuditActionLabel,
  canUseBulkAuditActions,
  canUseBulkDeleteActions,
  canUseBulkPrintActions,
  detailPrintLoading,
  hasAnyModuleAction,
  handlers: {
    exportMaterialRows: handleExportMaterialRows,
    exportRows,
    handlePrintSelectedRecords,
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    markSelectedFreightDelivered,
    navigateToRoleActionEditor: () => {
      router.push('/role-action-editor')
    },
    openCreateEditor,
    openCustomerStatementGenerator,
    openFreightPickupList,
    openFreightStatementGenerator,
    openFreightSummary,
    openSupplierStatementGenerator,
  },
})

const {
  gridPanelEvents,
  gridPanelProps,
} = useModuleGridPanelBindings({
  moduleKey: computed(() => props.moduleKey),
  config,
  isReadOnly,
  readOnlyAlertActionLink,
  filters,
  visibleFilters,
  quickFilters,
  activeQuickFilterKey,
  hasAdvancedFilters,
  searchExpanded,
  tableErrorMessage,
  masterTableSummary,
  visibleToolbarActions,
  exportMenuItems,
  exportLoading,
  isMaterialModule,
  canExportRecords,
  canImportMaterials,
  columnSettingItems,
  getColumnSettingItemClass,
  handleColumnSettingDragStart,
  handleColumnSettingDragOver,
  handleColumnSettingDrop,
  resetListColumnSettingDragState,
  handleColumnVisibleChange,
  resetColumnSettings,
  mainTable,
  tableLoading: listQuery.isFetching,
  getRowClassName,
  rowProps: getGridRowProps,
  hasExpandableRows: computed(() => Boolean(expandable.value)),
  rowActionsRenderer,
  expandedRowRenderer,
  pagination,
  paginationTotal: computed(() => listResult.value.total),
  navigateTo: (to) => router.push(to),
  applyQuickFilter,
  setFilterValue,
  handleFilterValueChange,
  handleSearch,
  handleReset,
  clearTableError,
  handleAction,
  handleExportMenuClick,
  handleMaterialTemplateDownload,
  handleMaterialImportClick,
})

const {
  editorWorkspaceEvents,
  editorWorkspaceProps,
} = useModuleEditorWorkspaceBindings({
  visible: editorVisible,
  title: editorTitle,
  moduleKey: computed(() => props.moduleKey),
  editorForm,
  canEditFormFields,
  itemColumns: computed(() => config.value.itemColumns),
  visibleFormFields,
  systemHelperVisible,
  systemHelperTitle,
  checkedRoleNames,
  selectedRolePermissionLabels,
  roleTreeData,
  canSaveCurrentEditor,
  canSaveAndAuditCurrentEditor,
  editorSaving,
  formFieldSettingItems,
  getFormFieldSettingItemClass,
  handleFormFieldSettingDragStart,
  handleFormFieldSettingDragOver,
  handleFormFieldSettingDrop,
  resetFormFieldSettingDragState,
  handleFormFieldVisibleChange,
  resetFormFieldSettings,
  isEditorFieldDisabled,
  getEditorDateValue,
  isRoleTreeField,
  parentImportConfig,
  canManageEditorItems,
  canAddManualEditorItems,
  canEditItemColumns,
  editorColumnSettingItems,
  getEditorColumnSettingItemClass,
  handleEditorColumnSettingDragStart,
  handleEditorColumnSettingDragOver,
  handleEditorColumnSettingDrop,
  resetEditorColumnSettingDragState,
  handleEditorColumnVisibleChange,
  resetEditorColumnSettings,
  editorItems,
  editorItemWeightTotal,
  editorItemAmountTotal,
  shouldShowItemWeightSummary,
  shouldShowItemAmountSummary,
  lockedLineItemsNotice,
  editorDetailTableColumns,
  editorDetailTableScroll,
  getEditorItemRowProps,
  getEditorItemRowClassName,
  isEditorItemColumnEditable,
  isNumberEditorColumn,
  getEditorItemMin,
  getEditorItemPrecision,
  materialRows,
  warehouseRows,
  filterMaterialOption,
  formatWeight,
  formatAmount,
  formatCellValue,
  getStatusMeta,
  closeEditor,
  handleSaveEditor,
  setEditorFormValue,
  handleEditorDateValueChange,
  handleRoleTreeCheckChange,
  addEditorItem,
  openParentSelector,
  handleEditorItemDragStart,
  handleEditorItemDragEnd,
  removeEditorItem,
  removeSelectedEditorItems,
  handleEditorItemMaterialSelect,
  openMaterialSelector,
  handleEditorItemValueChange,
  handleEditorItemNumberChange,
  handleEditorItemInputChange,
})
</script>

<template>
  <div class="page-stack">
    <ModuleGridPanel v-bind="gridPanelProps" v-on="gridPanelEvents" />

    <ModuleEditorWorkspace
      v-model:selected-item-ids="selectedEditorItemIds"
      v-bind="editorWorkspaceProps"
      v-on="editorWorkspaceEvents"
    />

    <ModuleGridOverlays
      :detail-visible="detailVisible"
      :detail-title="`${config.title}详情`"
      :detail-fields="config.detailFields"
      :detail-column-count="config.detailColumnCount"
      :item-columns="config.itemColumns"
      :active-record="activeRecord"
      :can-print-records="canPrintRecords"
      :detail-print-loading="detailPrintLoading"
      :should-show-item-weight-summary="shouldShowItemWeightSummary"
      :should-show-item-amount-summary="shouldShowItemAmountSummary"
      :item-weight-summary-key="itemWeightSummaryKey"
      :item-amount-summary-key="itemAmountSummaryKey"
      :detail-table-columns="detailTableColumns"
      :detail-table-scroll="detailTableScroll"
      :can-edit-item-columns="canEditItemColumns"
      :editor-column-setting-items="editorColumnSettingItems"
      :get-editor-column-setting-item-class="getEditorColumnSettingItemClass"
      :handle-editor-column-setting-drag-start="handleEditorColumnSettingDragStart"
      :handle-editor-column-setting-drag-over="handleEditorColumnSettingDragOver"
      :handle-editor-column-setting-drop="handleEditorColumnSettingDrop"
      :reset-editor-column-setting-drag-state="resetEditorColumnSettingDragState"
      :handle-editor-column-visible-change="handleEditorColumnVisibleChange"
      :reset-editor-column-settings="resetEditorColumnSettings"
      :status-map="statusMap"
      :attachment-visible="attachmentVisible"
      :attachment-title="attachmentRecord ? `${getPrimaryNo(attachmentRecord)} 附件` : '附件'"
      :attachment-paste-enabled="attachmentPasteEnabled"
      :can-manage-attachments="canManageAttachments"
      :attachment-draft-name="attachmentDraftName"
      :attachment-rows="attachmentRows"
      :attachment-saving="attachmentSaving"
      :handle-attachment-before-upload="handleAttachmentBeforeUpload"
      :handle-add-attachment="handleAddAttachment"
      :handle-preview-attachment="handlePreviewAttachment"
      :handle-download-attachment="handleDownloadAttachment"
      :handle-remove-attachment="handleRemoveAttachment"
      :material-selector-visible="materialSelectorVisible"
      :material-selector-rows="materialSelectorRows"
      :material-selector-columns="materialSelectorColumns"
      :material-selector-loading="materialListQuery.isFetching.value"
      :material-selector-row-selection="materialSelectorRowSelection"
      :material-selector-keyword="materialSelectorKeyword"
      :material-selector-current-page="materialSelectorCurrentPage"
      :material-selector-page-size="materialSelectorPageSize"
      :material-selector-total="materialRowTotal"
      :get-material-selector-row-props="getMaterialSelectorRowProps"
      :material-selector-selected-code="materialSelectorSelectedCode"
      :has-active-material-selector-item="Boolean(activeMaterialSelectorItem)"
      :supplier-statement-generator-visible="supplierStatementGeneratorVisible"
      :supplier-statement-candidate-rows="supplierStatementCandidateRows"
      :supplier-statement-generator-loading="supplierStatementGeneratorLoading"
      :supplier-statement-keyword="supplierStatementKeyword"
      :supplier-statement-current-page="supplierStatementCurrentPage"
      :supplier-statement-page-size="supplierStatementPageSize"
      :supplier-statement-total="supplierStatementTotal"
      :supplier-statement-row-selection="supplierStatementRowSelection"
      :supplier-statement-selected-inbounds="supplierStatementSelectedInbounds"
      :supplier-statement-selected-supplier-name="supplierStatementSelectedSupplierName"
      :customer-statement-generator-visible="customerStatementGeneratorVisible"
      :customer-statement-candidate-rows="customerStatementCandidateRows"
      :customer-statement-generator-loading="customerStatementGeneratorLoading"
      :customer-statement-keyword="customerStatementKeyword"
      :customer-statement-current-page="customerStatementCurrentPage"
      :customer-statement-page-size="customerStatementPageSize"
      :customer-statement-total="customerStatementTotal"
      :customer-statement-row-selection="customerStatementRowSelection"
      :customer-statement-selected-orders="customerStatementSelectedOrders"
      :customer-statement-selected-customer-name="customerStatementSelectedCustomerName"
      :customer-statement-selected-project-name="customerStatementSelectedProjectName"
      :freight-statement-generator-visible="freightStatementGeneratorVisible"
      :freight-statement-candidate-rows="freightStatementCandidateRows"
      :freight-statement-generator-loading="freightStatementGeneratorLoading"
      :freight-statement-keyword="freightStatementKeyword"
      :freight-statement-current-page="freightStatementCurrentPage"
      :freight-statement-page-size="freightStatementPageSize"
      :freight-statement-total="freightStatementTotal"
      :freight-statement-row-selection="freightStatementRowSelection"
      :freight-statement-selected-bills="freightStatementSelectedBills"
      :freight-statement-selected-carrier-name="freightStatementSelectedCarrierName"
      :freight-summary-visible="freightSummaryVisible"
      :freight-summary-rows="freightSummaryRows"
      :freight-summary-columns="freightSummaryColumns"
      :freight-summary-loading="freightSummaryLoading"
      :freight-pickup-list-visible="freightPickupListVisible"
      :freight-pickup-list-rows="freightPickupListRows"
      :freight-pickup-list-loading="freightPickupListLoading"
      :freight-pickup-list-selected-bills="freightPickupListSelectedBills"
      :freight-pickup-list-carrier-names="freightPickupListCarrierNames"
      :freight-pickup-list-bill-nos="freightPickupListBillNos"
      :freight-pickup-list-total-weight="freightPickupListTotalWeight"
      :parent-selector-visible="parentSelectorVisible"
      :parent-import-config="parentImportConfig"
      :parent-selector-rows="parentSelectorRows"
      :parent-selector-loading="parentListQuery.isFetching.value || parentAvailabilityLoading"
      :parent-selector-row-selection="parentSelectorRowSelection"
      :get-parent-selector-row-props="getParentSelectorRowProps"
      :parent-selector-keyword="parentSelectorKeyword"
      :parent-selector-current-page="parentSelectorCurrentPage"
      :parent-selector-page-size="parentSelectorPageSize"
      :parent-selector-total="parentRowTotal"
      :can-save-current-editor="canSaveCurrentEditor"
      :parent-importable-quantity-visible="parentImportableQuantityVisible"
      :get-parent-importable-quantity="getParentImportableQuantity"
      :get-parent-relation-no="getParentRelationNo"
      :get-parent-option-label="getParentOptionLabel"
      :material-import-visible="materialImportVisible"
      :material-import-loading="materialImportLoading"
      :material-import-file="materialImportFile"
      :material-import-result-visible="materialImportResultVisible"
      :material-import-result="materialImportResult"
      :handle-material-import-before-upload="handleMaterialImportBeforeUpload"
      :format-weight="formatWeight"
      :format-amount="formatAmount"
      :format-cell-value="formatCellValue"
      :get-status-meta="getStatusMeta"
      @close-detail="handleCloseDetail"
      @print-detail="handlePrintDetail"
      @close-attachment="closeAttachmentDialog"
      @update-attachment-draft-name="attachmentDraftName = $event"
      @close-material-selector="closeMaterialSelector"
      @confirm-material-selector="confirmMaterialSelector"
      @update-material-selector-keyword="updateMaterialSelectorKeyword"
      @update-material-selector-current-page="handleMaterialSelectorPageChange"
      @update-material-selector-page-size="handleMaterialSelectorPageSizeChange"
      @close-supplier-statement-generator="closeSupplierStatementGenerator"
      @generate-supplier-statement="handleGenerateSupplierStatement"
      @update-supplier-statement-keyword="updateSupplierStatementKeyword"
      @update-supplier-statement-current-page="updateSupplierStatementCurrentPage"
      @update-supplier-statement-page-size="updateSupplierStatementPageSize"
      @close-customer-statement-generator="closeCustomerStatementGenerator"
      @generate-customer-statement="handleGenerateCustomerStatement"
      @update-customer-statement-keyword="updateCustomerStatementKeyword"
      @update-customer-statement-current-page="updateCustomerStatementCurrentPage"
      @update-customer-statement-page-size="updateCustomerStatementPageSize"
      @close-freight-statement-generator="closeFreightStatementGenerator"
      @generate-freight-statement="handleGenerateFreightStatement"
      @update-freight-statement-keyword="updateFreightStatementKeyword"
      @update-freight-statement-current-page="updateFreightStatementCurrentPage"
      @update-freight-statement-page-size="updateFreightStatementPageSize"
      @close-freight-summary="freightSummaryVisible = false"
      @close-freight-pickup-list="closeFreightPickupList"
      @close-parent-selector="closeParentSelector"
      @confirm-parent-import="handleImportParentItems()"
      @update-parent-selector-keyword="handleParentSelectorKeywordChange"
      @update-parent-selector-current-page="handleParentSelectorPageChange"
      @update-parent-selector-page-size="handleParentSelectorPageSizeChange"
      @cancel-material-import="closeMaterialImportModal"
      @submit-material-import="handleMaterialImportSubmit"
      @close-material-import-result="closeMaterialImportResultModal"
    />
  </div>
</template>
