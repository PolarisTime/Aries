<script setup lang="ts">
/**
 * BusinessGridView — unified CRUD view for 20+ business modules.
 *
 * DECOMPOSITION ROADMAP (in order of impact):
 *  1. Extract editor workspace (lines ~1960-2420) → ModuleEditorWorkspace.vue
 *     - Props: editorVisible, editorTitle, editorForm, canEditFormFields, ...
 *     - This is the largest inline section (~460 lines).
 *  2. Extract filter toolbar (lines ~1612-1730) → ModuleFilterToolbar.vue
 *     - Props: filters, visibleFilters, quickFilters, ...
 *  3. Extract editor form field renderer (lines ~2070-2130) → FormFieldRenderer.vue
 *     - Reusable across editor and detail views.
 *  4. Replace module-specific adapters with ModuleBehaviorRegistry calls.
 *     - Done for editor adapter; remaining: statements, finance-links, parent-import.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { MenuOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { MenuProps } from 'ant-design-vue'
import type { SelectValue } from 'ant-design-vue/es/select'
import {
  deleteBusinessModule,
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
} from '@/api/business'
import { businessPageConfigs } from '@/config/business-pages'
import { isSuccessCode } from '@/api/client'
import { showRequestError } from '@/composables/use-request-error'
import {
  buildWeightOverview,
  compactWeightOnlyPurchaseItemColumns,
} from '@/config/business-pages/shared'
import { usePermissionStore } from '@/stores/permission'
import { resolveResourceKey } from '@/constants/resource-permissions'
import type {
  ModuleActionDefinition,
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { exportRecordsToExcel } from '@/utils/export-excel'
import ModuleSelectionOverlay from './components/ModuleSelectionOverlay.vue'
import ModuleAttachmentModal from './components/ModuleAttachmentModal.vue'
import ColumnSettingsPopover from './components/ColumnSettingsPopover.vue'
import EditorFooterActions from './components/EditorFooterActions.vue'
import EditorItemsSummary from './components/EditorItemsSummary.vue'
import ModuleStatementGenerator from './components/ModuleStatementGenerator.vue'
import ModuleTableToolbar from './components/ModuleTableToolbar.vue'
import RbacHelperPanel from './components/RbacHelperPanel.vue'
import TableRowActions from './components/TableRowActions.vue'
import ModuleFreightPickupListOverlay from './components/ModuleFreightPickupListOverlay.vue'
import ModuleMaterialImportDialogs from './components/ModuleMaterialImportDialogs.vue'
import ModuleParentSelectorOverlay from './components/ModuleParentSelectorOverlay.vue'
import ModuleRecordDetailOverlay from './components/ModuleRecordDetailOverlay.vue'
import {
  buildEditorAuditTarget,
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
  type PermissionActionCode,
} from './module-adapter-actions'
import {
  canModuleEditLineItems,
  canManageEditorLineItems,
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
  isEditorFieldDisabledForModule,
  isEditorItemColumnEditableForModule,
  isSalesOrderLineLocked,
} from './module-adapter-editor'
import {
  generatePrimaryNo as buildModulePrimaryNo,
  getFriendlyTagColor,
  getModuleRecordPrimaryNo,
  getTagListValues,
  isFriendlyTagColumnKey,
  isTagListColumnKey,
  parseParentRelationNos,
} from './module-adapter-shared'
import {
  buildCustomerStatementOptions,
  buildFreightStatementOptions,
  buildSupplierStatementOptions,
} from './module-adapter-finance-links'
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
import { useMaterialImport } from './use-material-import'
import { useFreightPickupList } from './use-freight-pickup-list'
import { useMaterialSelector } from './use-material-selector'
import { useParentImportSupport } from './use-parent-import-support'
import { getStoredUser } from '@/utils/storage'
import { cloneLineItems, resetReactiveObject } from '@/utils/clone-utils'
import { inferColumnAlign } from '@/utils/column-utils'
import {
  isUploadRuleListRow as isUploadRuleRowForModule,
  shouldHideUploadRuleListValue,
  UPLOAD_RULE_DEFAULT_CODE,
  UPLOAD_RULE_DEFAULT_NAME,
  UPLOAD_RULE_DEFAULT_TITLE,
} from './use-upload-rule-support'

// Suppress vue-tsc false positives: these are used in the template.
void isFriendlyTagColumnKey; void isTagListColumnKey; void shouldHideUploadRuleListValue

const props = defineProps<{
  moduleKey: string
}>()
type TextModelValue = string | number | undefined
type DateRangeModelValue = [Dayjs, Dayjs] | undefined
type DynamicColumn = {
  key?: unknown
  dataIndex?: unknown
}

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const permissionStore = usePermissionStore()

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
})

const autoOpenedDocNo = ref('')
const submittedFilters = ref<Record<string, unknown>>({})
const filters = reactive<Record<string, unknown>>({})
const toggleSearchStatus = ref(false)
const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSaving = ref(false)
const editorForm = reactive<Record<string, unknown>>({})
const editorSourceRecordId = ref('')
const selectedRowKeys = ref<string[]>([])
const selectedRowMap = ref<Record<string, ModuleRecord>>({})
const exportLoading = ref(false)
const materialSelectorKeyword = ref('')

const FREIGHT_PICKUP_LIST_COLUMNS: ModuleColumnDefinition[] = [
  { title: '品牌', dataIndex: 'brand', width: 100 },
  { title: '材质', dataIndex: 'material', width: 110 },
  { title: '规格', dataIndex: 'spec', width: 100 },
  { title: '长度', dataIndex: 'length', width: 100 },
  { title: '数量', dataIndex: 'quantity', width: 100, align: 'right', type: 'count' },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 100 },
  { title: '总重', dataIndex: 'totalWeight', width: 110, align: 'right', type: 'weight' },
  { title: '重量单位', dataIndex: 'weightUnit', width: 100, align: 'center' },
  { title: '仓库名称', dataIndex: 'warehouseName', width: 140 },
  { title: '客户名', dataIndex: 'customerName', width: 160 },
]

const WEIGHT_ONLY_VIEW_SETTING_CODES: Record<string, string> = {
  'purchase-inbounds': 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS',
  'sales-outbounds': 'UI_WEIGHT_ONLY_SALES_OUTBOUNDS',
}

const INVOICE_ASSIST_MODULE_KEYS = new Set(['invoice-receipts', 'invoice-issues'])

const supportsWeightOnlyViewSwitch = computed(() => props.moduleKey in WEIGHT_ONLY_VIEW_SETTING_CODES)
const supportsInvoiceAssist = computed(() => INVOICE_ASSIST_MODULE_KEYS.has(props.moduleKey))
const weightOnlyViewSettingsQuery = useQuery({
  queryKey: ['business-grid-all', 'general-settings', 'weight-only-view-switches'],
  queryFn: async () => {
    try {
      return await listAllBusinessModuleRows('general-settings', {})
    } catch {
      return []
    }
  },
  enabled: supportsWeightOnlyViewSwitch,
  placeholderData: keepPreviousData,
})

function buildWeightOnlyViewConfig(baseConfig: ModulePageConfig) {
  return {
    ...baseConfig,
    columns: baseConfig.columns.filter((column) => column.dataIndex !== 'totalAmount'),
    detailFields: baseConfig.detailFields.filter((field) => field.key !== 'totalAmount'),
    itemColumns: compactWeightOnlyPurchaseItemColumns,
    buildOverview: (rows: ModuleRecord[]) => buildWeightOverview(rows),
  }
}

const config = computed<ModulePageConfig>(() => {
  const found = businessPageConfigs[props.moduleKey]
  if (!found) {
    throw new Error(`Unknown module key: ${props.moduleKey}`)
  }

  const switchCode = WEIGHT_ONLY_VIEW_SETTING_CODES[props.moduleKey]
  const isWeightOnlyViewEnabled = Boolean(
    switchCode
    && (weightOnlyViewSettingsQuery.data.value || []).some((row) =>
      String(row.settingCode || '') === switchCode && String(row.status || '') === '正常',
    ),
  )

  return isWeightOnlyViewEnabled ? buildWeightOnlyViewConfig(found) : found
})

const isMaterialModule = computed(() => props.moduleKey === 'materials')
const moduleResource = computed(() => resolveResourceKey(props.moduleKey))
const canViewRecords = computed(() => permissionStore.can(moduleResource.value, 'read'))
const canCreateRecords = computed(() => permissionStore.can(moduleResource.value, 'create'))
const canEditRecords = computed(() => permissionStore.can(moduleResource.value, 'update'))
const canDeleteRecords = computed(() => permissionStore.can(moduleResource.value, 'delete'))
const canAuditRecords = computed(() => permissionStore.can(moduleResource.value, 'audit'))
const canExportRecords = computed(() => permissionStore.can(moduleResource.value, 'export'))
const canPrintRecords = computed(() => permissionStore.can(moduleResource.value, 'print'))
const canImportMaterials = computed(() => canEditRecords.value)
const canSaveCurrentEditor = computed(() =>
  editorMode.value === 'edit' ? canEditRecords.value : canCreateRecords.value,
)
const canSaveAndAuditCurrentEditor = computed(() =>
  canSaveCurrentEditor.value && canAuditRecords.value && canAuditEditor.value,
)

function hasAnyModuleAction(actionCodes: PermissionActionCode[]) {
  return actionCodes.some((actionCode) => permissionStore.can(moduleResource.value, actionCode))
}

function canViewModuleRecords(moduleKey: string | null | undefined) {
  return Boolean(moduleKey) && permissionStore.can(resolveResourceKey(String(moduleKey)), 'read')
}

function openCreateEditorWithDraft(draft: ModuleRecord) {
  editorMode.value = 'create'
  editorSourceRecordId.value = ''
  resetParentImportState()
  resetReactiveObject(editorForm, draft)
  editorVisible.value = true
}

function createEditorBaseDraft() {
  return buildEditorDraft('create') as ModuleRecord
}

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
  customerStatementGeneratorLoading,
  customerStatementGeneratorVisible,
  customerStatementRowSelection,
  customerStatementSelectedCustomerName,
  customerStatementSelectedOrders,
  customerStatementSelectedProjectName,
  freightStatementCandidateRows,
  freightStatementGeneratorLoading,
  freightStatementGeneratorVisible,
  freightStatementRowSelection,
  freightStatementSelectedBills,
  freightStatementSelectedCarrierName,
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
  supplierStatementGeneratorLoading,
  supplierStatementGeneratorVisible,
  supplierStatementRowSelection,
  supplierStatementSelectedInbounds,
  supplierStatementSelectedSupplierName,
} = useStatementGeneratorSupport({
  canViewRecords,
  moduleKey: computed(() => props.moduleKey),
  submittedFilters,
  createBaseDraft: createEditorBaseDraft,
  openEditorWithDraft: (draft) => {
    openCreateEditorWithDraft(draft)
  },
  showRequestError,
})

const {
  activeUploadRuleRowId,
  closeUploadRuleDialog,
  handleSaveUploadRule,
  openUploadRuleDialog,
  resetUploadRuleState,
  uploadRuleDetailRows,
  uploadRuleForm,
  uploadRuleLoading,
  uploadRuleSaving,
  uploadRuleStatusText,
  uploadRuleVisible,
} = useUploadRuleSupport({
  canEditRecords,
  canViewRecords,
  isSuccessCode,
  refreshModuleQueries,
  showRequestError,
})

function canUseAction(actionLabel: string) {
  return hasAnyModuleAction(resolveModuleActionPermissionCodes(actionLabel))
}

const visibleToolbarActions = computed<ModuleActionDefinition[]>(() =>
  (config.value.actions || []).filter((action) => canUseAction(action.label)),
)

const canEditItemColumns = computed(() => canModuleEditLineItems(props.moduleKey, Boolean(config.value.itemColumns?.length)))
const canEditFormFields = computed(() => Boolean(formFields.value.length))
const canEditLineItems = computed(() => canModuleEditLineItems(props.moduleKey, Boolean(config.value.itemColumns?.length)))
const formFields = computed(() => config.value.formFields || [])
const isReadOnly = computed(() => Boolean(config.value.readOnly))
const parentImportConfig = computed(() => config.value.parentImport)
const {
  listQuery,
  uploadRuleDetailQuery,
  parentListQuery,
  materialListQuery,
  customerStatementRowsQuery,
  supplierStatementRowsQuery,
  freightStatementRowsQuery,
  listResult,
  parentRows,
  moduleRows,
  materialRows,
  filteredMaterialSelectorRows,
  warehouseRows,
  departmentRows,
  customerStatementRows,
  supplierStatementRows,
  freightStatementRows,
  downstreamSalesOutbounds,
  materialMap,
  currentInvoiceTaxRate,
} = useBusinessQueries({
  moduleKey: computed(() => props.moduleKey),
  submittedFilters,
  paginationCurrentPage: computed(() => pagination.currentPage),
  paginationPageSize: computed(() => pagination.pageSize),
  canViewRecords,
  isReadOnly,
  canEditLineItems,
  editorVisible,
  supportsInvoiceAssist,
  parentImportConfig,
  canViewModuleRecords: (moduleKey) => canViewModuleRecords(moduleKey),
  materialSelectorKeyword,
})
const visibleFilters = computed(() =>
  toggleSearchStatus.value ? config.value.filters : config.value.filters.slice(0, 3),
)
const quickFilters = computed(() => config.value.quickFilters || [])
const hasAdvancedFilters = computed(() => config.value.filters.length > 3)
const shouldShowItemAmountSummary = computed(() =>
  Boolean(config.value.itemColumns?.some((column) => column.dataIndex === 'amount')),
)
const editorItemQuantityTotal = computed(() => sumLineItemsBy(editorItems.value, 'quantity'))
const editorItemWeightTotal = computed(() => sumLineItemsBy(editorItems.value, 'weightTon'))
const editorItemAmountTotal = computed(() => sumLineItemsBy(editorItems.value, 'amount'))

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

function getFilterFieldId(fieldKey: string) {
  return `filter-field-${props.moduleKey}-${fieldKey}`
}

function getEditorFieldId(fieldKey: string) {
  return `editor-field-${props.moduleKey}-${fieldKey}`
}

function createFilters(pageConfig: ModulePageConfig) {
  return Object.fromEntries(
    pageConfig.filters.map((filter) => [filter.key, filter.type === 'dateRange' ? undefined : '']),
  ) as Record<string, string | Dayjs[] | undefined>
}

function resolveFilterOptions(filter: ModulePageConfig['filters'][number]) {
  if (!filter.options) {
    return []
  }
  return typeof filter.options === 'function'
    ? filter.options(filters as Record<string, unknown>)
    : filter.options
}

function isFilterOptionGroup(option: { label: string } | { label: string; options: unknown[] }) {
  return 'options' in option
}

function flattenFilterOptions(filter: ModulePageConfig['filters'][number]) {
  return resolveFilterOptions(filter).flatMap((option) =>
    isFilterOptionGroup(option) ? option.options : [option],
  )
}

function areFilterValuesEqual(left: unknown, right: unknown) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return false
  }
  return String(left ?? '').trim() === String(right ?? '').trim()
}

function isQuickFilterActive(filterPreset: { values: Record<string, string | undefined> }) {
  return config.value.filters.every((filter) => {
    const currentValue = filters[filter.key]
    const expectedValue = filterPreset.values[filter.key]
    if (filter.type === 'dateRange') {
      return expectedValue === undefined && (currentValue === undefined || currentValue === null)
    }
    return areFilterValuesEqual(currentValue, expectedValue)
  })
}

const activeQuickFilterKey = computed(() =>
  quickFilters.value.find((filterPreset) => isQuickFilterActive(filterPreset))?.key || '',
)

function applyQuickFilter(filterPreset: { values: Record<string, string | undefined> }) {
  resetReactiveObject(filters as Record<string, unknown>, createFilters(config.value))
  Object.entries(filterPreset.values).forEach(([key, value]) => {
    filters[key] = value ?? ''
  })
  handleSearch()
}

function handleFilterValueChange() {
  config.value.filters.forEach((filter) => {
    if (filter.type !== 'select') {
      return
    }
    const currentValue = String(filters[filter.key] ?? '').trim()
    if (!currentValue) {
      return
    }
    const availableOptions = flattenFilterOptions(filter)
    if (!availableOptions.some((option) => option.value === currentValue)) {
      filters[filter.key] = ''
    }
  })
}

function isUploadRuleListRow(record: ModuleRecord | null | undefined) {
  return isUploadRuleRowForModule(props.moduleKey, record)
}

function buildSubmittedFilters() {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => {
        if (Array.isArray(value) && value.length === 2) {
          return [key, value.map((item) => item.format('YYYY-MM-DD'))]
        }
        return [key, value]
      })
      .filter(([, value]) => {
        if (value === undefined || value === null) {
          return false
        }
        if (Array.isArray(value)) {
          return value.length === 2 && value.every(Boolean)
        }
        return String(value).trim().length > 0
      }),
  )
}

const statusMap = computed(() => config.value.statusMap || {})
const {
  formatAmount,
  formatCellValue,
  formatWeight,
  getStatusMeta,
} = useModuleDisplaySupport(statusMap)
const rawColumnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
  Object.fromEntries(config.value.columns.map((column) => [column.dataIndex, column])),
)
const rawFormFieldMetaMap = computed<Record<string, ModuleFormFieldDefinition>>(() =>
  Object.fromEntries(formFields.value.map((field) => {
    if (field.key === 'warehouseName' && field.type === 'select') {
      return [field.key, {
        ...field,
        options: warehouseRows.value.map((warehouse) => ({
          label: String(warehouse.warehouseName || ''),
          value: String(warehouse.warehouseName || ''),
        })),
      }]
    }
    if (props.moduleKey === 'departments' && field.key === 'parentId') {
      const currentDepartmentId = String(editorForm.id || '')
      return [field.key, {
        ...field,
        type: 'select',
        options: departmentRows.value
          .filter((department) =>
            String(department.status || '') === '正常'
            && String(department.id || '') !== currentDepartmentId,
          )
          .map((department) => ({
            label: String(department.departmentName || department.departmentCode || ''),
            value: Number(department.id),
          })),
      }]
    }
    if (field.key === 'sourceStatementId' && props.moduleKey === 'receipts') {
      return [field.key, {
        ...field,
        type: 'select',
        label: '关联客户对账单',
        options: receiptStatementOptions.value,
        placeholder: receiptStatementFieldPlaceholder.value,
        disabled: Boolean(field.disabled) || !receiptStatementOptions.value.length,
      }]
    }
    if (field.key === 'sourceStatementId' && props.moduleKey === 'payments') {
      return [field.key, {
        ...field,
        type: 'select',
        label: paymentStatementFieldLabel.value,
        options: paymentStatementOptions.value,
        placeholder: paymentStatementFieldPlaceholder.value,
        disabled: Boolean(field.disabled) || !paymentStatementOptions.value.length,
      }]
    }
    return [field.key, field]
  })),
)

const attachmentFeatureEnabled = computed(() => {
  const response = uploadRuleDetailQuery.data.value
  if (!response || !isSuccessCode(response.code) || !response.data) {
    return true
  }
  return String(response.data.status || '正常') === '正常'
})

const canManageAttachments = computed(() =>
  canEditRecords.value && attachmentFeatureEnabled.value,
)

const visibleConfigColumns = computed(() =>
  columnSettingItems.value
    .filter((item) => item.visible)
    .map((item) => rawColumnMetaMap.value[item.key])
    .filter(Boolean),
)

const columnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
  Object.fromEntries(visibleConfigColumns.value.map((column) => [column.dataIndex, column])),
)
const visibleFormFields = computed(() =>
  formFieldSettingItems.value
    .filter((item) => item.visible)
    .map((item) => rawFormFieldMetaMap.value[item.key])
    .filter(Boolean),
)

const tableColumns = computed(() => [
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: isReadOnly.value ? 84 : 172,
    align: 'center' as const,
    fixed: 'left' as const,
  },
  ...visibleConfigColumns.value.map((column) => ({
    title: column.title,
    dataIndex: column.dataIndex,
    key: column.dataIndex,
    align: inferColumnAlign(column),
  })),
])

const exportMenuItems = computed<MenuProps['items']>(() => [
  {
    key: 'selected',
    label: `导出选中 (${selectedRowKeys.value.length})`,
    disabled: selectedRowKeys.value.length === 0,
  },
  {
    key: 'page',
    label: `导出当前页 (${listResult.value.rows.length})`,
    disabled: listResult.value.rows.length === 0,
  },
  {
    key: 'filtered',
    label: `导出当前筛选 (${listResult.value.total})`,
    disabled: listResult.value.total === 0,
  },
])

const detailTableColumns = computed(() =>
  (config.value.itemColumns || []).map((column) => ({
    title: column.title,
    dataIndex: column.dataIndex,
    key: column.dataIndex,
    width: column.width || 120,
    align: inferColumnAlign(column),
    ellipsis: true,
  })),
)

const rawEditorColumnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
  Object.fromEntries((config.value.itemColumns || []).map((column) => [column.dataIndex, column])),
)

const visibleEditorColumns = computed(() => {
  if (!canEditItemColumns.value) {
    return config.value.itemColumns || []
  }

  return editorColumnSettingItems.value
    .filter((item) => item.visible)
    .map((item) => rawEditorColumnMetaMap.value[item.key])
    .filter(Boolean)
})

const editorDetailTableColumns = computed(() =>
  [
    ...(canEditLineItems.value
      ? [{
          title: '操作',
          dataIndex: 'editorAction',
          key: 'editorAction',
          width: 116,
          align: 'center' as const,
          fixed: 'left' as const,
        }]
      : []),
    ...visibleEditorColumns.value.map((column) => ({
      title: column.title,
      dataIndex: column.dataIndex,
      key: column.dataIndex,
      width: column.width || 120,
      align: inferColumnAlign(column),
      ellipsis: true,
    })),
  ],
)

const tableScroll = computed(() => ({
  x: 'max-content' as const,
}))

const detailTableScroll = computed(() => ({
  x: sumColumnWidths(config.value.itemColumns || []),
}))

const editorDetailTableScroll = computed(() => ({
  x: sumColumnWidths(visibleEditorColumns.value) + (canEditLineItems.value ? 116 : 0),
}))

const tablePagination = computed(() => ({
  current: pagination.currentPage,
  pageSize: pagination.pageSize,
  total: listResult.value.total,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`,
}))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  fixed: true,
  getCheckboxProps: (record: ModuleRecord) => ({
    disabled: isUploadRuleListRow(record),
  }),
  onChange: (keys: Array<string | number>) => {
    selectedRowKeys.value = keys.map((key) => String(key))
  },
  onSelect: (record: ModuleRecord, selected: boolean) => {
    const nextMap = { ...selectedRowMap.value }
    if (selected) {
      nextMap[String(record.id)] = record
    } else {
      delete nextMap[String(record.id)]
    }
    selectedRowMap.value = nextMap
  },
  onSelectAll: (selected: boolean, selectedRows: ModuleRecord[], changeRows: ModuleRecord[]) => {
    const nextMap = { ...selectedRowMap.value }
    if (selected) {
      selectedRows.forEach((row: ModuleRecord) => {
        nextMap[String(row.id)] = row
      })
    } else {
      changeRows.forEach((row: ModuleRecord) => {
        delete nextMap[String(row.id)]
      })
    }
    selectedRowMap.value = nextMap
  },
}))

const expandable = computed(() => {
  if (props.moduleKey === 'general-settings' && canViewRecords.value) {
    return {
      expandedRowKeys: uploadRuleVisible.value && activeUploadRuleRowId.value ? [activeUploadRuleRowId.value] : [],
      rowExpandable: (record: ModuleRecord) => isUploadRuleListRow(record),
      onExpand: (expanded: boolean, record: ModuleRecord) => {
        if (!isUploadRuleListRow(record)) {
          return
        }
        if (expanded) {
          void openUploadRuleDialog(record)
          return
        }
        closeUploadRuleDialog()
      },
    }
  }

  if (config.value.itemColumns?.length) {
    return {
      rowExpandable: (record: ModuleRecord) => Boolean(record.items?.length),
    }
  }

  return undefined
})

const masterTableSummary = computed(() => `共 ${listResult.value.total} 条记录`)

const tableErrorMessage = ref('')

function handleTableError(event: Event) {
  const detail = (event as Event & { detail?: { code: number; message: string } }).detail
  if (detail?.message) {
    tableErrorMessage.value = detail.message
  }
}
function clearTableError() {
  tableErrorMessage.value = ''
}

onMounted(() => {
  window.addEventListener('leo:table-error', handleTableError)
  window.addEventListener('leo:table-error-cleared', clearTableError)
})
onBeforeUnmount(() => {
  window.removeEventListener('leo:table-error', handleTableError)
  window.removeEventListener('leo:table-error-cleared', clearTableError)
})

const editorTitle = computed(() => {
  if (editorMode.value === 'edit') {
    return `编辑${config.value.title}`
  }
  return `新增${config.value.title}`
})

const editorItems = computed<ModuleLineItem[]>(() =>
  Array.isArray(editorForm.items) ? (editorForm.items as ModuleLineItem[]) : [],
)

const paymentBusinessType = computed(() => String(editorForm.businessType || '').trim())
const receiptStatementOptions = computed(() =>
  buildCustomerStatementOptions(customerStatementRows.value, {
    currentStatementId: Number(editorForm.sourceStatementId || 0),
    customerName: String(editorForm.customerName || ''),
    projectName: String(editorForm.projectName || ''),
  }),
)
const paymentStatementOptions = computed(() => {
  if (paymentBusinessType.value === '供应商') {
    return buildSupplierStatementOptions(supplierStatementRows.value, {
      currentStatementId: Number(editorForm.sourceStatementId || 0),
      counterpartyName: String(editorForm.counterpartyName || ''),
    })
  }
  if (paymentBusinessType.value === '物流商') {
    return buildFreightStatementOptions(freightStatementRows.value, {
      currentStatementId: Number(editorForm.sourceStatementId || 0),
      counterpartyName: String(editorForm.counterpartyName || ''),
    })
  }
  return []
})
const paymentStatementFieldLabel = computed(() => {
  if (paymentBusinessType.value === '供应商') {
    return '关联供应商对账单'
  }
  if (paymentBusinessType.value === '物流商') {
    return '关联物流对账单'
  }
  return '关联对账单'
})
const receiptStatementFieldPlaceholder = computed(() => {
  if (!String(editorForm.customerName || '').trim() || !String(editorForm.projectName || '').trim()) {
    return '可先选择对账单，系统会自动回填客户和项目'
  }
  return receiptStatementOptions.value.length ? '请选择关联客户对账单' : '没有可选的客户对账单'
})
const paymentStatementFieldPlaceholder = computed(() => {
  if (!paymentBusinessType.value) {
    return '请先选择业务类型'
  }
  if (paymentBusinessType.value === '供应商' && !String(editorForm.counterpartyName || '').trim()) {
    return '可先选择供应商对账单，系统会自动回填往来单位'
  }
  if (paymentBusinessType.value === '物流商' && !String(editorForm.counterpartyName || '').trim()) {
    return '可先选择物流对账单，系统会自动回填往来单位'
  }
  return paymentStatementOptions.value.length ? `请选择${paymentStatementFieldLabel.value}` : `没有可选的${paymentStatementFieldLabel.value}`
})
const sourceStatementOptions = computed(() => {
  if (props.moduleKey === 'receipts') {
    return receiptStatementOptions.value
  }
  if (props.moduleKey === 'payments') {
    return paymentStatementOptions.value
  }
  return []
})
const sourceStatementOptionsReady = computed(() => {
  if (!editorVisible.value) {
    return false
  }
  if (props.moduleKey === 'receipts') {
    return customerStatementRowsQuery.isFetched.value
  }
  if (props.moduleKey === 'payments') {
    if (paymentBusinessType.value === '供应商') {
      return supplierStatementRowsQuery.isFetched.value
    }
    if (paymentBusinessType.value === '物流商') {
      return freightStatementRowsQuery.isFetched.value
    }
  }
  return false
})

const salesOrderRelatedOutbounds = computed(() => {
  if (props.moduleKey !== 'sales-orders') {
    return []
  }

  const orderNo = String(editorForm.orderNo || '').trim()
  if (!orderNo) {
    return []
  }

  return downstreamSalesOutbounds.value.filter((record) =>
    parseParentRelationNos(record.salesOrderNo).includes(orderNo),
  )
})

const salesOrderLineLocked = computed(() =>
  props.moduleKey === 'sales-orders'
  && isSalesOrderLineLocked(salesOrderRelatedOutbounds.value.map((record) => String(record.status || ''))),
)

const editorAuditTarget = computed(() => {
  const statusField = formFields.value.find((field) => field.key === 'status')
  return buildEditorAuditTarget(
    props.moduleKey,
    (statusField?.options || []).map((option) => String(option.value)),
    salesOrderLineLocked.value,
  )
})

const canAuditEditor = computed(() => Boolean(editorAuditTarget.value))
const canManageEditorItems = computed(() =>
  canManageEditorLineItems(
    props.moduleKey,
    canEditLineItems.value,
    canSaveCurrentEditor.value,
    salesOrderLineLocked.value,
  ),
)
const canAddManualEditorItems = computed(() =>
  canManageEditorItems.value && props.moduleKey !== 'invoice-issues',
)

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

async function fetchParentImportDetail(record: ModuleRecord) {
  if (!parentImportConfig.value?.parentModuleKey) {
    return record
  }

  const response = await getBusinessModuleDetail(parentImportConfig.value.parentModuleKey, String(record.id))
  if (!isSuccessCode(response.code) || !response.data) {
    throw new Error(response.message || '获取上级单据详情失败')
  }

  return response.data
}

const {
  closeParentSelector,
  getParentOptionLabel,
  getParentRelationNo,
  getParentSelectorRowProps,
  handleImportParentItems,
  occupiedParentMap,
  openParentSelector,
  parentSelectorKeyword,
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
})

const {
  activeRecord,
  detailPrintLoading,
  detailVisible,
  handleCloseDetail,
  handlePrintDetail,
  handleView,
  resolveRecordForDetail,
} = useDetailSupport({
  moduleKey: computed(() => props.moduleKey),
  config,
  statusMap,
  canViewRecords,
  canPrintRecords,
  activeUploadRuleRowId,
  uploadRuleVisible,
  isUploadRuleListRow,
  closeUploadRuleDialog,
  openUploadRuleDialog,
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
  materialSelectorVisible,
  materialSelectorSelectedCode,
  activeMaterialSelectorItem,
  materialSelectorRowSelection,
  openMaterialSelector,
  closeMaterialSelector,
  confirmMaterialSelector,
  getMaterialSelectorRowProps,
} = useMaterialSelector({
  editorItems,
  materialSelectorKeyword,
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

function resetPageState() {
  resetReactiveObject(filters as Record<string, unknown>, createFilters(config.value))
  submittedFilters.value = {}
  pagination.currentPage = 1
  detailVisible.value = false
  activeRecord.value = null
  autoOpenedDocNo.value = ''
  toggleSearchStatus.value = false
  selectedRowKeys.value = []
  selectedRowMap.value = {}
  closeFreightPickupList()
  resetStatementSupportState()
  closeMaterialImportModal()
  resetUploadRuleState()
  closeEditor()
  initColumnSettings()
  initFormFieldSettings()
  initEditorColumnSettings()
}

function applyRouteDocNo() {
  const docNo = String(route.query.docNo || '').trim()
  const hasKeywordFilter = config.value.filters.some((item) => item.key === 'keyword')
  if (!docNo || !hasKeywordFilter) {
    return
  }

  filters.keyword = docNo
  submittedFilters.value = {
    ...submittedFilters.value,
    keyword: docNo,
  }
  pagination.currentPage = 1
}

watch(
  () => props.moduleKey,
  () => {
    resetPageState()
    applyRouteDocNo()
  },
  { immediate: true },
)

watch(
  () => route.query.docNo,
  () => {
    autoOpenedDocNo.value = ''
    applyRouteDocNo()
  },
)

watch(
  () => listResult.value.rows,
  (rows) => {
    if (!rows.length) {
      return
    }

    const nextMap = { ...selectedRowMap.value }
    rows.forEach((row) => {
      if (selectedRowKeys.value.includes(String(row.id))) {
        nextMap[String(row.id)] = row
      }
    })
    selectedRowMap.value = nextMap

    const docNo = String(route.query.docNo || '').trim()
    const openDetail = String(route.query.openDetail || '') === '1'
    if (!docNo || !openDetail || autoOpenedDocNo.value === docNo) {
      return
    }

    const matched = rows.find((record) => getPrimaryNo(record) === docNo)
    if (matched) {
      autoOpenedDocNo.value = docNo
      handleView(matched)
    }
  },
  { immediate: true },
)

function sumColumnWidths(columns: ModuleColumnDefinition[]) {
  return columns.reduce((sum, column) => sum + (column.width || 120), 0)
}

function handleSearch() {
  submittedFilters.value = buildSubmittedFilters()
  pagination.currentPage = 1
}

function handleReset() {
  resetPageState()
}

async function refreshModuleQueries() {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['business-grid', props.moduleKey],
    }),
    queryClient.invalidateQueries({
      queryKey: ['business-grid-all', props.moduleKey],
    }),
  ])
}

async function handleAction(actionLabel: string) {
  if (!canUseAction(actionLabel)) {
    message.warning(`暂无${actionLabel}权限`)
    return
  }

  switch (resolveModuleActionKind({
    moduleKey: props.moduleKey,
    actionLabel,
    hasFormFields: formFields.value.length > 0,
    isMaterialModule: isMaterialModule.value,
  })) {
    case 'openSupplierStatementGenerator':
      await openSupplierStatementGenerator()
      return
    case 'openCustomerStatementGenerator':
      await openCustomerStatementGenerator()
      return
    case 'openFreightStatementGenerator':
      await openFreightStatementGenerator()
      return
    case 'openCreateEditor':
      await openCreateEditor()
      return
    case 'exportMaterialRows':
      exportLoading.value = true
      try {
        await exportMaterialRows(submittedFilters.value, config.value.title)
      } finally {
        exportLoading.value = false
      }
      return
    case 'exportRows':
      await exportRows('filtered')
      return
    case 'openFreightPickupList':
      await openFreightPickupList()
      return
    case 'markSelectedFreightDelivered':
      await markSelectedFreightDelivered()
      return
    case 'openFreightSummary':
      await openFreightSummary()
      return
    case 'navigateToRoleActionEditor':
      router.push('/role-action-editor')
      return
    default:
      message.info(`${actionLabel} 当前没有额外处理逻辑。`)
  }
}

function formatExportCellValue(column: ModuleColumnDefinition, value: unknown) {
  if (column.type === 'status') {
    return getStatusMeta(value).text
  }

  const rendered = formatCellValue(column, value)
  return rendered === '--' ? '' : String(rendered)
}

async function exportRows(mode: 'selected' | 'page' | 'filtered') {
  if (!canExportRecords.value) {
    message.warning('暂无导出权限')
    return
  }
  if (mode === 'filtered') {
    const filteredRows = await listAllBusinessModuleRows(props.moduleKey, submittedFilters.value)
    if (!filteredRows.length) {
      message.warning('没有可导出的数据')
      return
    }

    exportRecordsToExcel(config.value.title, visibleConfigColumns.value, filteredRows, formatExportCellValue)
    message.success('Excel 导出已开始')
    return
  }

  const rows = mode === 'selected'
    ? selectedRowKeys.value
      .map((key) => selectedRowMap.value[key])
      .filter(Boolean)
    : listResult.value.rows

  if (!rows.length) {
    message.warning('没有可导出的数据')
    return
  }

  exportRecordsToExcel(config.value.title, visibleConfigColumns.value, rows, formatExportCellValue)
  message.success('Excel 导出已开始')
}

async function handleExportMenuClick(info: { key: string | number }) {
  exportLoading.value = true
  try {
    const key = String(info.key)
    if (key === 'selected' || key === 'page' || key === 'filtered') {
      await exportRows(key)
    }
  } finally {
    exportLoading.value = false
  }
}

function handleTableChange(page: { current?: number; pageSize?: number }) {
  pagination.currentPage = page.current || 1
  pagination.pageSize = page.pageSize || 20
}

async function handleEdit(record: ModuleRecord) {
  if (isUploadRuleListRow(record)) {
    if (!canEditRecords.value) {
      message.warning('暂无编辑权限')
      return
    }
    await openUploadRuleDialog(record)
    return
  }
  if (!canEditRecords.value) {
    message.warning('暂无编辑权限')
    return
  }
  if (isReadOnly.value) {
    await handleView(record)
    return
  }

  if (!formFields.value.length) {
    await handleView(record)
    return
  }

  const detailRecord = await resolveRecordForDetail(record)

  editorMode.value = 'edit'
  editorSourceRecordId.value = String(detailRecord.id || '')
  resetParentImportState()
  resetReactiveObject(editorForm, buildEditorDraft('edit', detailRecord))
  syncSystemEditorState()
  editorVisible.value = true
}

async function handleDelete(record: ModuleRecord) {
  if (isUploadRuleListRow(record)) {
    message.warning('页面上传命名规则不支持删除')
    return
  }
  if (!canDeleteRecords.value) {
    message.warning('暂无删除权限')
    return
  }
  if (isReadOnly.value) {
    message.warning('当前模块为只读模式')
    return
  }

  try {
    const response = await deleteBusinessModule(props.moduleKey, String(record.id))
    if (!isSuccessCode(response.code)) {
      throw new Error(response.message || '删除失败')
    }

    selectedRowKeys.value = selectedRowKeys.value.filter((key) => key !== String(record.id))
    if (selectedRowMap.value[String(record.id)]) {
      const nextMap = { ...selectedRowMap.value }
      delete nextMap[String(record.id)]
      selectedRowMap.value = nextMap
    }
    if (activeRecord.value?.id === record.id) {
      handleCloseDetail()
    }
    if (attachmentRecord.value?.id === record.id) {
      closeAttachmentDialog()
    }

    await refreshModuleQueries()
    message.success(response.message || `已删除 ${getPrimaryNo(record)}`)
  } catch (error) {
    showRequestError(error, '删除失败')
  }
}

function getCurrentOperatorName() {
  const user = getStoredUser()
  return String(user?.userName || user?.loginName || '当前用户')
}

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

function generatePrimaryNo() {
  const serial = String(Date.now()).slice(-6)
  const year = dayjs().format('YYYY')
  return buildModulePrimaryNo(props.moduleKey, year, serial)
}

async function generatePrimaryNoAsync() {
  try {
    return await generateBusinessPrimaryNo(props.moduleKey)
  } catch {
    return generatePrimaryNo()
  }
}

function getPrimaryNo(record: ModuleRecord) {
  return getModuleRecordPrimaryNo(record, config.value.primaryNoKey)
}

function getRowClassName(record: ModuleRecord) {
  const status = String(record.status || '')
  return config.value.rowHighlightStatuses?.includes(status) ? 'table-row-emphasis' : ''
}

function sumLineItemsBy(items: ModuleLineItem[], key: string) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

function isEditorFieldDisabled(field: ModuleFormFieldDefinition) {
  return isEditorFieldDisabledForModule(
    props.moduleKey,
    field.key,
    Boolean(field.disabled),
    canSaveCurrentEditor.value,
    salesOrderLineLocked.value,
  )
}

function isEditorItemColumnEditable(columnKey: string) {
  return isEditorItemColumnEditableForModule(
    props.moduleKey,
    columnKey,
    canEditLineItems.value,
    salesOrderLineLocked.value,
  )
}

/** Bridge AG Grid row type (Record<string, unknown>) to domain type. Safe because row data originates from typed API responses. */
function asModuleRecord(record: Record<string, unknown>): ModuleRecord {
  return record as unknown as ModuleRecord
}
/** @see asModuleRecord */
function asModuleLineItem(record: Record<string, unknown>): ModuleLineItem {
  return record as unknown as ModuleLineItem
}

function getTextModelValue(source: Record<string, unknown>, key: string): TextModelValue {
  const value = source[key]
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function getSelectModelValue(source: Record<string, unknown>, key: string): SelectValue {
  const value = source[key]
  if (Array.isArray(value)) {
    return value.filter((item): item is string | number | boolean =>
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    ) as SelectValue
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === undefined) {
    return value as SelectValue
  }
  return undefined
}

function getDateRangeModelValue(source: Record<string, unknown>, key: string): DateRangeModelValue {
  const value = source[key]
  if (Array.isArray(value) && value.length === 2 && dayjs.isDayjs(value[0]) && dayjs.isDayjs(value[1])) {
    return [value[0], value[1]]
  }
  return undefined
}

function getNumberModelValue(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

function setFilterValue(key: string, value: unknown) {
  filters[key] = value
}

function setEditorFormValue(key: string, value: unknown) {
  editorForm[key] = value
}

function asDynamicColumn(column: unknown): DynamicColumn {
  return column && typeof column === 'object' ? column as DynamicColumn : {}
}

function getTableColumnKey(column: unknown) {
  const target = asDynamicColumn(column)
  if (typeof target.key === 'string' || typeof target.key === 'number') {
    return String(target.key)
  }
  if (typeof target.dataIndex === 'string' || typeof target.dataIndex === 'number') {
    return String(target.dataIndex)
  }
  return ''
}

function getTableColumnDataIndex(column: unknown) {
  const target = asDynamicColumn(column)
  if (typeof target.dataIndex === 'string' || typeof target.dataIndex === 'number') {
    return String(target.dataIndex)
  }
  return ''
}

function getRecordCellValue(record: unknown, column: unknown) {
  const dataIndex = getTableColumnDataIndex(column)
  if (!dataIndex || !record || typeof record !== 'object') {
    return undefined
  }
  return (record as Record<string, unknown>)[dataIndex]
}

function getListColumnMeta(column: unknown) {
  const key = getTableColumnKey(column)
  return key ? columnMetaMap.value[key] : undefined
}

function getDetailItemColumnMeta(column: unknown) {
  const key = getTableColumnKey(column)
  return key ? config.value.itemColumns?.find((item) => item.dataIndex === key) : undefined
}

function getEditorSummaryCellValue(column: unknown) {
  const key = getTableColumnKey(column)
  if (key === 'editorAction') {
    return '合计'
  }
  if (key === 'quantity') {
    return editorItemQuantityTotal.value.toFixed(0)
  }
  if (key === 'weightTon') {
    return formatWeight(editorItemWeightTotal.value)
  }
  if (key === 'amount' && shouldShowItemAmountSummary.value) {
    return formatAmount(editorItemAmountTotal.value)
  }
  return ''
}

function handleRoleTreeCheckChange(
  checkedKeys: Array<string | number> | { checked: Array<string | number>; halfChecked?: Array<string | number> },
) {
  handleRoleTreeCheck(checkedKeys)
}

function handleEditorDateValueChange(key: string, value: unknown) {
  if (value === null || dayjs.isDayjs(value)) {
    handleEditorDateChange(key, value)
  }
}
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="module-panel-card">
      <a-alert
        v-if="isReadOnly && config.description"
        type="info"
        show-icon
        :message="config.description"
        style="margin-bottom: 16px"
      >
        <template v-if="moduleKey === 'permission-management'" #message>
          {{ config.description }}
          <span class="table-action-link" style="margin-left: 8px" @click="router.push('/role-action-editor')">前往角色权限配置 →</span>
        </template>
      </a-alert>
      <div class="table-page-search-wrapper">
        <div
          v-if="quickFilters.length"
          style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;"
        >
          <span style="color: rgba(0, 0, 0, 0.45);">快捷筛选</span>
          <a-button
            v-for="filterPreset in quickFilters"
            :key="filterPreset.key"
            size="small"
            :type="activeQuickFilterKey === filterPreset.key ? 'primary' : 'default'"
            @click="applyQuickFilter(filterPreset)"
          >
            {{ filterPreset.label }}
          </a-button>
        </div>
        <a-form :model="filters" layout="inline" @submit.prevent="handleSearch">
          <a-row :gutter="24">
            <a-col
              v-for="filter in visibleFilters"
              :key="filter.key"
              :md="8"
              :sm="24"
            >
              <a-form-item
                :label="filter.label"
                :html-for="getFilterFieldId(filter.key)"
              >
                <a-input
                  v-if="filter.type === 'input'"
                  :id="getFilterFieldId(filter.key)"
                  :value="getTextModelValue(filters, filter.key)"
                  :name="filter.key"
                  :placeholder="filter.placeholder"
                  allow-clear
                  @update:value="setFilterValue(filter.key, $event)"
                  @press-enter="handleSearch"
                />
                <a-select
                  v-else-if="filter.type === 'select'"
                  :id="getFilterFieldId(filter.key)"
                  :value="getSelectModelValue(filters, filter.key)"
                  allow-clear
                  :placeholder="filter.placeholder || `请选择${filter.label}`"
                  @update:value="setFilterValue(filter.key, $event)"
                  @change="handleFilterValueChange"
                >
                  <template
                    v-for="option in resolveFilterOptions(filter)"
                    :key="isFilterOptionGroup(option) ? option.label : option.value"
                  >
                    <a-select-opt-group
                      v-if="isFilterOptionGroup(option)"
                      :label="option.label"
                    >
                      <a-select-option
                        v-for="groupOption in option.options"
                        :key="groupOption.value"
                        :value="groupOption.value"
                      >
                        {{ groupOption.label }}
                      </a-select-option>
                    </a-select-opt-group>
                    <a-select-option
                      v-else
                      :value="option.value"
                    >
                      {{ option.label }}
                    </a-select-option>
                  </template>
                </a-select>
                <a-range-picker
                  v-else
                  :id="getFilterFieldId(filter.key)"
                  :value="getDateRangeModelValue(filters, filter.key)"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  :placeholder="['开始时间', '结束时间']"
                  @update:value="(value) => setFilterValue(filter.key, value)"
                />
              </a-form-item>
            </a-col>

            <a-col :md="8" :sm="24" class="search-action-col">
              <div class="table-page-search-submitButtons">
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
                <a
                  v-if="hasAdvancedFilters"
                  style="margin-left: 8px"
                  @click="toggleSearchStatus = !toggleSearchStatus"
                >
                  {{ toggleSearchStatus ? '收起' : '展开' }}
                </a>
              </div>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <a-alert
        v-if="tableErrorMessage"
        type="warning"
        show-icon
        closable
        :message="tableErrorMessage"
        style="margin-bottom: 12px"
        @close="tableErrorMessage = ''"
      />

      <div class="module-table-shell">
        <ModuleTableToolbar
          :title="config.title"
          :summary="masterTableSummary"
          :actions="visibleToolbarActions"
          :export-menu-items="(exportMenuItems || []) as { label: string; key: string }[]"
          :export-loading="exportLoading"
          :is-material-module="isMaterialModule"
          :can-export="canExportRecords"
          :can-import="canImportMaterials"
          :column-setting-items="columnSettingItems"
          :get-column-setting-item-class="getColumnSettingItemClass"
          :handle-column-setting-drag-start="handleColumnSettingDragStart"
          :handle-column-setting-drag-over="handleColumnSettingDragOver"
          :handle-column-setting-drop="handleColumnSettingDrop"
          :reset-list-column-setting-drag-state="resetListColumnSettingDragState"
          :handle-column-visible-change="handleColumnVisibleChange"
          :reset-column-settings="resetColumnSettings"
          @action="handleAction"
          @export-menu-click="(key: string) => handleExportMenuClick({ key })"
          @material-template-download="handleMaterialTemplateDownload"
          @material-import-click="handleMaterialImportClick"
        />
        <a-table
          size="middle"
          bordered
          row-key="id"
          :columns="tableColumns"
          :data-source="listResult.rows"
          :loading="listQuery.isFetching.value"
          :row-selection="rowSelection"
          :pagination="tablePagination"
          :scroll="tableScroll"
          :expandable="expandable"
          :row-class-name="getRowClassName"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <TableRowActions
                :record="asModuleRecord(record)"
                :can-view="canViewRecords"
                :can-edit="!isReadOnly && canEditRecords"
                :can-delete="!isReadOnly && canDeleteRecords"
                :can-attach="!isReadOnly && canManageAttachments"
                :is-read-only="isReadOnly"
                :is-upload-rule-row="isUploadRuleListRow(asModuleRecord(record))"
                :upload-rule-expanded="uploadRuleVisible"
                :is-active-upload-rule-row="activeUploadRuleRowId === String(record.id || '')"
                @view="handleView"
                @edit="handleEdit"
                @delete="(r) => handleDelete(r)"
                @attachment="openAttachmentDialog"
              />
            </template>
            <template v-else-if="isTagListColumnKey(String(column.key))">
              <div class="cell-tag-group">
                <a-tag
                  v-for="item in getTagListValues(getRecordCellValue(record, column))"
                  :key="item"
                  color="processing"
                >
                  {{ item }}
                </a-tag>
              </div>
            </template>
            <template v-else-if="isFriendlyTagColumnKey(String(column.key))">
              <a-tag :color="getFriendlyTagColor(String(column.key), getRecordCellValue(record, column))">
                {{ formatCellValue(getListColumnMeta(column), getRecordCellValue(record, column)) }}
              </a-tag>
            </template>
            <template v-else-if="getListColumnMeta(column)?.type === 'status'">
              <a-tag :color="getStatusMeta(getRecordCellValue(record, column)).color">
                {{ getStatusMeta(getRecordCellValue(record, column)).text }}
              </a-tag>
            </template>
            <template v-else-if="shouldHideUploadRuleListValue(asModuleRecord(record), String(column.key))">
              --
            </template>
            <template v-else>
              {{ formatCellValue(getListColumnMeta(column), getRecordCellValue(record, column)) }}
            </template>
          </template>

          <template v-if="expandable" #expandedRowRender="{ record }">
            <div v-if="isUploadRuleListRow(record)">
              <a-spin :spinning="uploadRuleLoading">
                <div class="editor-items-head upload-rule-section-head">
                  <div class="editor-items-title-block">
                    <h3 class="detail-section-title">{{ uploadRuleForm.ruleName || UPLOAD_RULE_DEFAULT_TITLE }}</h3>
                    <span class="parent-selector-hint">{ext} 为扩展名本体，不带点号；系统会自动补齐最终文件后缀</span>
                  </div>
                </div>
                <a-table
                  size="small"
                  bordered
                  row-key="key"
                  :data-source="uploadRuleDetailRows"
                  :pagination="false"
                  :scroll="{ x: 980 }"
                  class="module-detail-table upload-rule-config-table"
                >
                  <a-table-column key="label" title="项目" data-index="label" width="180" />
                  <a-table-column key="description" title="说明" data-index="description" width="360" />
                  <a-table-column key="value" title="配置值 / 示例" width="380">
                    <template #default="{ record: detailRecord }">
                      <span v-if="detailRecord.type === 'token'">
                        {{ detailRecord.example || '--' }}
                      </span>
                      <span v-else-if="detailRecord.key === 'ruleCode'">
                        {{ uploadRuleForm.ruleCode || UPLOAD_RULE_DEFAULT_CODE }}
                      </span>
                      <span v-else-if="detailRecord.key === 'ruleName'">
                        {{ uploadRuleForm.ruleName || UPLOAD_RULE_DEFAULT_NAME }}
                      </span>
                      <span v-else-if="detailRecord.key === 'status'">
                        {{ uploadRuleStatusText }}
                      </span>
                      <a-input
                        v-else-if="detailRecord.key === 'renamePattern'"
                        v-model:value="uploadRuleForm.renamePattern"
                        :disabled="uploadRuleLoading"
                        class="editor-item-field"
                        placeholder="{yyyyMMddHHmmss}_{random8}"
                      />
                      <a-textarea
                        v-else-if="detailRecord.key === 'remark'"
                        v-model:value="uploadRuleForm.remark"
                        :disabled="uploadRuleLoading"
                        class="editor-item-field"
                        :auto-size="{ minRows: 2, maxRows: 4 }"
                        placeholder="说明该规则的适用范围"
                      />
                      <span v-else>
                        {{ uploadRuleForm.previewFileName || '--' }}
                      </span>
                    </template>
                  </a-table-column>
                </a-table>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                  <a-button @click="closeUploadRuleDialog">收起</a-button>
                  <a-button
                    v-if="canEditRecords"
                    type="primary"
                    :loading="uploadRuleSaving"
                    @click="handleSaveUploadRule"
                  >
                    保存
                  </a-button>
                </div>
              </a-spin>
            </div>
            <a-table
              v-else-if="config.itemColumns?.length"
              size="small"
              bordered
              row-key="id"
              :columns="detailTableColumns"
              :data-source="record.items || []"
              :pagination="false"
              :scroll="detailTableScroll"
              class="module-detail-table"
            >
              <template #bodyCell="{ column, record: itemRecord }">
                <template v-if="getDetailItemColumnMeta(column)?.type === 'status'">
                  <a-tag :color="getStatusMeta(getRecordCellValue(itemRecord, column)).color">
                    {{ getStatusMeta(getRecordCellValue(itemRecord, column)).text }}
                  </a-tag>
                </template>
                <template v-else>
                  {{
                    formatCellValue(
                      getDetailItemColumnMeta(column),
                      getRecordCellValue(itemRecord, column),
                    )
                  }}
                </template>
              </template>
            </a-table>
          </template>

          <template #emptyText>
            <a-empty description="当前筛选条件下暂无数据" />
          </template>
        </a-table>
      </div>
    </a-card>

    <div v-if="editorVisible" class="workspace-overlay">
      <div class="workspace-overlay-mask"></div>
      <section class="workspace-overlay-panel">
        <header class="workspace-overlay-header">
          <span class="workspace-overlay-title">{{ editorTitle }}</span>
        </header>

        <div class="workspace-overlay-body bill-detail-body">
        <div v-if="canEditFormFields" class="editor-form-head">
          <div class="editor-form-title-block">
            <h3 class="detail-section-title">单据信息</h3>
          </div>
          <div class="editor-form-actions">
            <ColumnSettingsPopover
              label="表单字段设置"
              :items="formFieldSettingItems"
              :get-item-class="getFormFieldSettingItemClass"
              :on-drag-start="handleFormFieldSettingDragStart"
              :on-drag-over="handleFormFieldSettingDragOver"
              :on-drop="handleFormFieldSettingDrop"
              :on-drag-end="resetFormFieldSettingDragState"
              :on-visible-change="handleFormFieldVisibleChange"
              :on-reset="resetFormFieldSettings"
            />
            <EditorFooterActions
              v-if="!config.itemColumns?.length"
              :can-save="canSaveCurrentEditor"
              :can-audit="canSaveAndAuditCurrentEditor"
              :saving="editorSaving"
              @cancel="closeEditor"
              @save="(audit) => handleSaveEditor(audit)"
            />
          </div>
        </div>
        <a-form :model="editorForm" layout="vertical" class="editor-form-shell">
          <RbacHelperPanel
            v-if="systemHelperVisible"
            :title="systemHelperTitle"
            :role-count="checkedRoleNames.length"
            :permission-count="selectedRolePermissionLabels.length"
            :data-scope="String(editorForm.dataScope || '--')"
            :permission-summary="String(editorForm.permissionSummary || '--')"
            :show-role-link="moduleKey === 'role-settings'"
          />
          <a-row :gutter="16">
            <a-col
              v-for="field in visibleFormFields"
              :key="field.key"
              :xs="24"
              :sm="12"
              :lg="field.type === 'textarea' ? 24 : 6"
            >
              <a-form-item
                :label="field.label"
                :html-for="getEditorFieldId(field.key)"
                :required="field.required"
              >
                <a-input
                  v-if="field.type === 'input'"
                  :id="getEditorFieldId(field.key)"
                  :value="getTextModelValue(editorForm, field.key)"
                  :name="field.key"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                  @update:value="(value) => setEditorFormValue(field.key, value)"
                />
                <a-select
                  v-else-if="field.type === 'select'"
                  :id="getEditorFieldId(field.key)"
                  :value="getSelectModelValue(editorForm, field.key)"
                  :allow-clear="field.allowClear || !field.required"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请选择${field.label}`"
                  @update:value="(value) => setEditorFormValue(field.key, value)"
                >
                  <a-select-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
                <div
                  v-else-if="isRoleTreeField(field)"
                  :id="getEditorFieldId(field.key)"
                  class="rbac-tree-field"
                >
                  <div class="rbac-tree-field-meta">
                    <span>已选 {{ checkedRoleNames.length }} 项</span>
                    <span class="rbac-tree-field-hint">按角色类型分组勾选</span>
                  </div>
                  <a-tree
                    checkable
                    block-node
                    default-expand-all
                    :checked-keys="checkedRoleNames"
                    :tree-data="roleTreeData"
                    @check="handleRoleTreeCheckChange"
                  />
                  <div v-if="selectedRolePermissionLabels.length" class="rbac-tree-field-summary">
                    自动汇总权限：{{ selectedRolePermissionLabels.join('、') }}
                  </div>
                </div>
                <a-select
                  v-else-if="field.type === 'multiSelect'"
                  :id="getEditorFieldId(field.key)"
                  :value="getSelectModelValue(editorForm, field.key)"
                  mode="multiple"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请选择${field.label}`"
                  @update:value="(value) => setEditorFormValue(field.key, value)"
                >
                  <a-select-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
                <a-date-picker
                  v-else-if="field.type === 'date'"
                  :id="getEditorFieldId(field.key)"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  :disabled="isEditorFieldDisabled(field)"
                  :value="getEditorDateValue(field.key)"
                  @change="handleEditorDateValueChange(field.key, $event)"
                />
                <a-input-number
                  v-else-if="field.type === 'number'"
                  :id="getEditorFieldId(field.key)"
                  :value="getNumberModelValue(editorForm, field.key)"
                  :name="field.key"
                  style="width: 100%"
                  :disabled="isEditorFieldDisabled(field)"
                  :min="field.min"
                  :precision="field.precision"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                  @update:value="(value) => setEditorFormValue(field.key, value)"
                />
                <a-textarea
                  v-else
                  :id="getEditorFieldId(field.key)"
                  :value="getTextModelValue(editorForm, field.key)"
                  :name="field.key"
                  :rows="3"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                  @update:value="(value) => setEditorFormValue(field.key, value)"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <template v-if="config.itemColumns?.length">
          <div class="editor-items-head">
            <div class="editor-items-title-block">
              <h3 class="detail-section-title">明细列表</h3>
            </div>
            <div class="editor-items-actions">
              <a-button
                v-if="canAddManualEditorItems"
                type="primary"
                class="overlay-action-button"
                @click="addEditorItem"
              >
                新增明细
              </a-button>
              <template v-if="parentImportConfig && canManageEditorItems">
                <a-button type="primary" class="overlay-action-button" @click="openParentSelector">
                  {{ parentImportConfig.buttonText || '选择上级单据导入' }}
                </a-button>
              </template>
              <ColumnSettingsPopover
                v-if="canEditItemColumns"
                label="明细列设置"
                :items="editorColumnSettingItems"
                :get-item-class="getEditorColumnSettingItemClass"
                :on-drag-start="handleEditorColumnSettingDragStart"
                :on-drag-over="handleEditorColumnSettingDragOver"
                :on-drop="handleEditorColumnSettingDrop"
                :on-drag-end="resetEditorColumnSettingDragState"
                :on-visible-change="handleEditorColumnVisibleChange"
                :on-reset="resetEditorColumnSettings"
              />
              <EditorFooterActions
                :can-save="canSaveCurrentEditor"
                :can-audit="canSaveAndAuditCurrentEditor"
                :saving="editorSaving"
                @cancel="closeEditor"
                @save="(audit) => handleSaveEditor(audit)"
              />
              <EditorItemsSummary
                class="editor-items-summary-inline"
                :item-count="editorItems.length"
                :weight="formatWeight(editorItemWeightTotal)"
                :amount="formatAmount(editorItemAmountTotal)"
                :show-amount="shouldShowItemAmountSummary"
              />
            </div>
            <EditorItemsSummary
              class="editor-items-summary-mobile"
              :item-count="editorItems.length"
              :weight="formatWeight(editorItemWeightTotal)"
              :amount="formatAmount(editorItemAmountTotal)"
              :show-amount="shouldShowItemAmountSummary"
            />
          </div>
          <div v-if="parentImportConfig" class="parent-import-note">
            {{ parentImportConfig.enforceUniqueRelation ? '当前单据链按上级单据唯一占用控制；重复导入同单号会更新，选择不同单号会追加明细' : '重复导入同单号会更新，选择不同单号会追加明细' }}
          </div>
          <div v-if="props.moduleKey === 'sales-orders' && salesOrderLineLocked" class="parent-import-note">
            当前销售订单已存在已审核的销售出库，数量和商品信息已锁定，仅允许调整单价、金额、送货日期和备注。
          </div>
          <a-table
            size="small"
            bordered
            row-key="id"
            :columns="editorDetailTableColumns"
            :data-source="editorItems"
            :pagination="false"
            :scroll="editorDetailTableScroll"
            :custom-row="getEditorItemRowProps"
            :row-class-name="getEditorItemRowClassName"
            class="module-detail-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'editorAction'">
                <div v-if="canManageEditorItems" class="editor-row-action-group">
                  <span
                    class="editor-row-drag-handle"
                    draggable="true"
                    title="拖动排序"
                    @dragstart="handleEditorItemDragStart(String(record.id), $event)"
                    @dragend="handleEditorItemDragEnd"
                  >
                    <MenuOutlined />
                  </span>
                  <a-button type="link" class="editor-row-action" @click="removeEditorItem(String(record.id))">
                    删除
                  </a-button>
                </div>
                <span v-else class="editor-row-action-lock">已锁定</span>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key)) && column.key === 'materialCode'"
              >
                <div class="editor-material-selector">
                  <a-select
                    :value="record.materialCode"
                    show-search
                    allow-clear
                    class="editor-item-field"
                    style="width: 100%"
                    placeholder="选择商品编码"
                    :filter-option="filterMaterialOption"
                    @change="handleEditorItemMaterialSelect(asModuleLineItem(record), $event)"
                  >
                    <a-select-option
                      v-for="material in materialRows"
                      :key="String(material.materialCode)"
                      :value="String(material.materialCode)"
                      :label="`${material.materialCode} ${material.brand || ''} ${material.spec || ''}`"
                    >
                      {{ material.materialCode }} / {{ material.brand }} / {{ material.spec }}
                    </a-select-option>
                  </a-select>
                  <a-button
                    type="text"
                    class="editor-material-selector-button"
                    title="弹窗选择商品"
                    @mousedown.prevent
                    @click.stop="openMaterialSelector(asModuleLineItem(record))"
                  >
                    <template #icon>
                      <SearchOutlined />
                    </template>
                  </a-button>
                </div>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key)) && column.key === 'warehouseName'"
              >
                <a-select
                  :value="record.warehouseName"
                  show-search
                  allow-clear
                  class="editor-item-field"
                  placeholder="选择码头"
                  :filter-option="filterMaterialOption"
                  @change="handleEditorItemValueChange(asModuleLineItem(record), 'warehouseName', $event)"
                >
                  <a-select-option
                    v-for="warehouse in warehouseRows"
                    :key="String(warehouse.warehouseName)"
                    :value="String(warehouse.warehouseName)"
                    :label="String(warehouse.warehouseName || '')"
                  >
                    {{ warehouse.warehouseName }}
                  </a-select-option>
                </a-select>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key)) && isNumberEditorColumn(String(column.key))"
              >
                <a-input-number
                  :value="Number(getRecordCellValue(record, column) || 0)"
                  class="editor-item-field"
                  style="width: 100%"
                  :min="getEditorItemMin(String(column.key))"
                  :precision="getEditorItemPrecision(String(column.key))"
                  @change="handleEditorItemNumberChange(asModuleLineItem(record), String(column.key), $event)"
                />
              </template>
              <template v-else-if="isEditorItemColumnEditable(String(column.key))">
                <a-input
                  :value="String(getRecordCellValue(record, column) || '')"
                  class="editor-item-field"
                  @change="handleEditorItemInputChange(asModuleLineItem(record), String(column.key), $event)"
                />
              </template>
              <template
                v-else-if="getDetailItemColumnMeta(column)?.type === 'status'"
              >
                <a-tag :color="getStatusMeta(getRecordCellValue(record, column)).color">
                  {{ getStatusMeta(getRecordCellValue(record, column)).text }}
                </a-tag>
              </template>
              <template v-else>
                {{
                  formatCellValue(
                    getDetailItemColumnMeta(column),
                    getRecordCellValue(record, column),
                  )
                }}
              </template>
            </template>

            <template #emptyText>
              <a-empty :description="parentImportConfig ? (canAddManualEditorItems ? '当前没有明细，可手动新增或从上级单据导入' : '当前没有明细，请从上级单据导入') : '当前没有明细，可手动新增'" />
            </template>

            <template #summary>
              <a-table-summary-row>
                <a-table-summary-cell
                  v-for="(column, index) in editorDetailTableColumns"
                  :key="getTableColumnKey(column)"
                  :index="index"
                  :align="column.align"
                >
                  {{ getEditorSummaryCellValue(column) }}
                </a-table-summary-cell>
              </a-table-summary-row>
            </template>
          </a-table>
        </template>
        </div>
      </section>
    </div>

    <ModuleRecordDetailOverlay
      :visible="detailVisible"
      :title="`${config.title}详情`"
      :detail-fields="config.detailFields"
      :item-columns="config.itemColumns"
      :active-record="activeRecord"
      :can-print-records="canPrintRecords"
      :detail-print-loading="detailPrintLoading"
      :should-show-item-amount-summary="shouldShowItemAmountSummary"
      :detail-table-columns="detailTableColumns"
      :detail-table-scroll="detailTableScroll"
      :status-map="statusMap"
      @close="handleCloseDetail"
      @print="handlePrintDetail"
    />

    <ModuleAttachmentModal
      :visible="attachmentVisible"
      :title="attachmentRecord ? `${getPrimaryNo(attachmentRecord)} 附件` : '附件'"
      :paste-enabled="attachmentPasteEnabled"
      :can-manage-attachments="canManageAttachments"
      :draft-name="attachmentDraftName"
      :rows="attachmentRows"
      :saving="attachmentSaving"
      :before-upload="handleAttachmentBeforeUpload"
      :add-attachment="handleAddAttachment"
      :preview-attachment="handlePreviewAttachment"
      :download-attachment="handleDownloadAttachment"
      :remove-attachment="handleRemoveAttachment"
      @cancel="closeAttachmentDialog"
      @update:draft-name="attachmentDraftName = $event"
    />

    <ModuleSelectionOverlay
      :visible="materialSelectorVisible"
      title="选择商品"
      panel-title="商品列表"
      hint="可按商品编码、品牌、材质、规格搜索，双击行可直接确认。"
      :rows="filteredMaterialSelectorRows"
      :loading="materialListQuery.isFetching.value"
      :row-selection="materialSelectorRowSelection"
      :custom-row="getMaterialSelectorRowProps"
      empty-description="暂无可选商品"
      confirm-text="选择商品"
      :confirm-disabled="!materialSelectorSelectedCode || !activeMaterialSelectorItem"
      row-key="materialCode"
      @cancel="closeMaterialSelector"
      @confirm="confirmMaterialSelector"
    >
      <template #meta>
        <div class="module-table-head-meta statement-generator-meta">
          <span class="module-table-head-title">商品列表</span>
          <a-input
            v-model:value="materialSelectorKeyword"
            allow-clear
            class="parent-selector-search"
            placeholder="输入商品编码、品牌、材质、规格搜索"
          />
          <span class="parent-selector-hint">双击行可直接确认</span>
        </div>
      </template>

      <template #summary>
        <span v-if="materialSelectorSelectedCode">已选 {{ materialSelectorSelectedCode }}</span>
      </template>

      <a-table-column key="materialCode" title="商品编码" data-index="materialCode" width="160" />
      <a-table-column key="brand" title="品牌" data-index="brand" width="120" />
      <a-table-column key="material" title="材质" data-index="material" width="120" />
      <a-table-column key="spec" title="规格" data-index="spec" width="120" />
      <a-table-column key="length" title="长度" data-index="length" width="100" />
      <a-table-column key="unit" title="单位" data-index="unit" width="90" />
      <a-table-column key="unitPrice" title="单价" width="110" align="right">
        <template #default="{ record }">
          {{ formatAmount(record.unitPrice) }}
        </template>
      </a-table-column>
    </ModuleSelectionOverlay>

    <ModuleStatementGenerator
      :supplier-visible="supplierStatementGeneratorVisible"
      :supplier-rows="supplierStatementCandidateRows"
      :supplier-loading="supplierStatementGeneratorLoading"
      :supplier-row-selection="supplierStatementRowSelection"
      :supplier-summary="{
        count: supplierStatementSelectedInbounds.length,
        supplierName: supplierStatementSelectedSupplierName,
        amount: supplierStatementSelectedInbounds.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
      }"
      :customer-visible="customerStatementGeneratorVisible"
      :customer-rows="customerStatementCandidateRows"
      :customer-loading="customerStatementGeneratorLoading"
      :customer-row-selection="customerStatementRowSelection"
      :customer-summary="{
        count: customerStatementSelectedOrders.length,
        customerName: customerStatementSelectedCustomerName,
        projectName: customerStatementSelectedProjectName,
        amount: customerStatementSelectedOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
      }"
      :freight-visible="freightStatementGeneratorVisible"
      :freight-rows="freightStatementCandidateRows"
      :freight-loading="freightStatementGeneratorLoading"
      :freight-row-selection="freightStatementRowSelection"
      :freight-summary="{
        count: freightStatementSelectedBills.length,
        carrierName: freightStatementSelectedCarrierName,
        weight: freightStatementSelectedBills.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0),
        freight: freightStatementSelectedBills.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0),
      }"
      :format-weight="formatWeight"
      :format-amount="formatAmount"
      :format-cell-value="formatCellValue as (column: { title: string; dataIndex: string; type?: string }, value: unknown) => string"
      :get-status-meta="getStatusMeta"
      @close-supplier="closeSupplierStatementGenerator"
      @generate-supplier="handleGenerateSupplierStatement"
      @close-customer="closeCustomerStatementGenerator"
      @generate-customer="handleGenerateCustomerStatement"
      @close-freight="closeFreightStatementGenerator"
      @generate-freight="handleGenerateFreightStatement"
    />

    <ModuleSelectionOverlay
      :visible="freightSummaryVisible"
      title="运费对账汇总"
      panel-title="物流商汇总"
      hint="按当前筛选条件汇总各物流商的对账单数、吨位、应付与已付金额。"
      :rows="freightSummaryRows"
      :loading="freightSummaryLoading"
      :pagination="false"
      empty-description="暂无汇总数据"
      cancel-text="关闭"
      :confirm-visible="false"
      @cancel="freightSummaryVisible = false"
    >
      <a-table-column key="carrierName" title="物流商" data-index="carrierName" />
      <a-table-column key="statementCount" title="对账单数" data-index="statementCount" width="100" align="right" />
      <a-table-column key="totalWeight" title="总吨位" width="120" align="right">
        <template #default="{ record }">
          {{ formatWeight(record.totalWeight) }}
        </template>
      </a-table-column>
      <a-table-column key="totalFreight" title="总运费" width="120" align="right">
        <template #default="{ record }">
          {{ formatAmount(record.totalFreight) }}
        </template>
      </a-table-column>
      <a-table-column key="paidAmount" title="已付金额" width="120" align="right">
        <template #default="{ record }">
          {{ formatAmount(record.paidAmount) }}
        </template>
      </a-table-column>
      <a-table-column key="unpaidAmount" title="未付金额" width="120" align="right">
        <template #default="{ record }">
          {{ formatAmount(record.unpaidAmount) }}
        </template>
      </a-table-column>
    </ModuleSelectionOverlay>

    <ModuleFreightPickupListOverlay
      :visible="freightPickupListVisible"
      :rows="freightPickupListRows"
      :loading="freightPickupListLoading"
      :selected-bill-count="freightPickupListSelectedBills.length"
      :carrier-names="freightPickupListCarrierNames"
      :bill-nos="freightPickupListBillNos"
      :total-weight="freightPickupListTotalWeight"
      :quantity-column="FREIGHT_PICKUP_LIST_COLUMNS[4]"
      @close="closeFreightPickupList"
    />

    <ModuleParentSelectorOverlay
      :visible="parentSelectorVisible"
      :title="parentImportConfig?.label ? `选择${parentImportConfig.label}` : '选择上级单据'"
      :rows="parentSelectorRows"
      :loading="parentListQuery.isFetching.value"
      :row-selection="parentSelectorRowSelection"
      :custom-row="getParentSelectorRowProps"
      :keyword="parentSelectorKeyword"
      :can-confirm="canSaveCurrentEditor"
      :get-parent-relation-no="getParentRelationNo"
      :get-parent-option-label="getParentOptionLabel"
      :get-status-meta="getStatusMeta"
      @cancel="closeParentSelector"
      @confirm="handleImportParentItems()"
      @update:keyword="parentSelectorKeyword = $event"
    />

    <ModuleMaterialImportDialogs
      :import-visible="materialImportVisible"
      :import-loading="materialImportLoading"
      :import-file="materialImportFile"
      :result-visible="materialImportResultVisible"
      :result="materialImportResult"
      :before-upload="handleMaterialImportBeforeUpload"
      @cancel-import="closeMaterialImportModal"
      @submit-import="handleMaterialImportSubmit"
      @close-result="closeMaterialImportResultModal"
    />
  </div>
</template>

<style scoped>
.table-action-link {
  color: #1890ff;
  cursor: pointer;
  text-decoration: none;
}

.table-action-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}
</style>
