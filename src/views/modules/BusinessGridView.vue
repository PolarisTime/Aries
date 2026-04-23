<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { MenuOutlined, PaperClipOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { MenuProps } from 'ant-design-vue'
import { getDefaultPrintTemplate } from '@/api/print-template'
import { deleteBusinessModule, listBusinessModule, saveBusinessModule } from '@/api/business'
import { businessPageConfigs } from '@/config/business-pages'
import type {
  ListColumnSettings,
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { execPrintCode, isCLodopCode, loadCLodop, printHtml } from '@/utils/clodop'
import { exportRecordsToExcel } from '@/utils/export-excel'
import { normalizeTableResponse } from '@/utils/list'
import { buildModulePrintHtml } from '@/utils/module-print'
import { renderPrintTemplate } from '@/utils/print-template-engine'
import {
  clearListColumnSettings,
  getStoredUser,
  getListColumnSettings,
  setListColumnSettings,
} from '@/utils/storage'

const props = defineProps<{
  moduleKey: string
}>()

interface AttachmentItem {
  id: string
  name: string
  uploader: string
  uploadTime: string
}

interface FreightSummaryRow {
  id: string
  carrierName: string
  statementCount: number
  totalWeight: number
  totalFreight: number
  paidAmount: number
  unpaidAmount: number
}

const permissionLabelMap: Record<string, string> = {
  PURCHASE_ORDER_VIEW: '采购订单查看',
  PURCHASE_INBOUND_EDIT: '采购入库编辑',
  SALES_ORDER_AUDIT: '销售订单审核',
  FINANCE_PAYMENT_DELETE: '付款单删除',
  CONTRACT_VIEW: '合同管理查看',
  SYSTEM_SETTING_EDIT: '系统设置维护',
}

const rolePermissionCodeMap: Record<string, string[]> = {
  系统管理员: ['PURCHASE_ORDER_VIEW', 'PURCHASE_INBOUND_EDIT', 'SALES_ORDER_AUDIT', 'FINANCE_PAYMENT_DELETE', 'CONTRACT_VIEW', 'SYSTEM_SETTING_EDIT'],
  采购主管: ['PURCHASE_ORDER_VIEW', 'PURCHASE_INBOUND_EDIT', 'CONTRACT_VIEW'],
  销售经理: ['SALES_ORDER_AUDIT', 'CONTRACT_VIEW'],
  财务专员: ['FINANCE_PAYMENT_DELETE'],
  仓库主管: ['PURCHASE_INBOUND_EDIT', 'CONTRACT_VIEW'],
}

const route = useRoute()
const editableItemColumnModuleKeys = new Set([
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'freight-statements',
  'purchase-contracts',
  'sales-contracts',
])

const queryClient = useQueryClient()

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
})

const detailVisible = ref(false)
const detailPrintLoading = ref(false)
const activeRecord = ref<ModuleRecord | null>(null)
const autoOpenedDocNo = ref('')
const submittedFilters = ref<Record<string, unknown>>({})
const filters = reactive<Record<string, string | Dayjs[] | undefined>>({})
const toggleSearchStatus = ref(false)
const columnSettingItems = ref<
  Array<{ key: string; title: string; visible: boolean }>
>([])
const formFieldSettingItems = ref<
  Array<{ key: string; title: string; visible: boolean }>
>([])
const editorColumnSettingItems = ref<
  Array<{ key: string; title: string; visible: boolean }>
>([])

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSaving = ref(false)
const editorForm = reactive<Record<string, unknown>>({})
const editorSourceRecordId = ref('')
const selectedParentId = ref<string>()
const parentSelectorVisible = ref(false)
const parentSelectorKeyword = ref('')
const selectedRowKeys = ref<string[]>([])
const selectedRowMap = ref<Record<string, ModuleRecord>>({})
const exportLoading = ref(false)
const attachmentVisible = ref(false)
const attachmentSaving = ref(false)
const attachmentRecord = ref<ModuleRecord | null>(null)
const attachmentDraftName = ref('')
const supplierStatementGeneratorVisible = ref(false)
const supplierStatementGeneratorLoading = ref(false)
const supplierStatementCandidateRows = ref<ModuleRecord[]>([])
const supplierStatementSelectedInboundKeys = ref<string[]>([])
const customerStatementGeneratorVisible = ref(false)
const customerStatementGeneratorLoading = ref(false)
const customerStatementCandidateRows = ref<ModuleRecord[]>([])
const customerStatementSelectedOrderKeys = ref<string[]>([])
const freightStatementGeneratorVisible = ref(false)
const freightStatementGeneratorLoading = ref(false)
const freightStatementCandidateRows = ref<ModuleRecord[]>([])
const freightStatementSelectedBillKeys = ref<string[]>([])
const freightSummaryVisible = ref(false)
const freightSummaryLoading = ref(false)
const freightSummaryRows = ref<FreightSummaryRow[]>([])
const draggedEditorItemId = ref<string>()
const dragOverEditorItemId = ref<string>()
const dragOverEditorItemPosition = ref<'before' | 'after'>('after')
const draggedColumnSettingKey = ref<string>()
const dragOverColumnSettingKey = ref<string>()
const dragOverColumnSettingPosition = ref<'before' | 'after'>('after')
const draggedFormFieldSettingKey = ref<string>()
const dragOverFormFieldSettingKey = ref<string>()
const dragOverFormFieldSettingPosition = ref<'before' | 'after'>('after')
const draggedEditorColumnSettingKey = ref<string>()
const dragOverEditorColumnSettingKey = ref<string>()
const dragOverEditorColumnSettingPosition = ref<'before' | 'after'>('after')

const config = computed<ModulePageConfig>(() => {
  const found = businessPageConfigs[props.moduleKey]
  if (!found) {
    throw new Error(`Unknown module key: ${props.moduleKey}`)
  }
  return found
})

const canEditItemColumns = computed(() =>
  editableItemColumnModuleKeys.has(props.moduleKey) && Boolean(config.value.itemColumns?.length),
)
const canEditFormFields = computed(() => Boolean(formFields.value.length))
const canEditLineItems = computed(() =>
  editableItemColumnModuleKeys.has(props.moduleKey) && Boolean(config.value.itemColumns?.length),
)
const formFields = computed(() => config.value.formFields || [])
const parentImportConfig = computed(() => config.value.parentImport)
const visibleFilters = computed(() =>
  toggleSearchStatus.value ? config.value.filters : config.value.filters.slice(0, 3),
)
const hasAdvancedFilters = computed(() => config.value.filters.length > 3)

function createFilters(pageConfig: ModulePageConfig) {
  return Object.fromEntries(
    pageConfig.filters.map((filter) => [filter.key, filter.type === 'dateRange' ? undefined : '']),
  ) as Record<string, string | Dayjs[] | undefined>
}

function resetReactiveObject(target: Record<string, unknown>, next: Record<string, unknown>) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })
  Object.assign(target, next)
}

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
  closeSupplierStatementGenerator()
  closeCustomerStatementGenerator()
  closeFreightStatementGenerator()
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

const listQuery = useQuery({
  queryKey: computed(() => [
    'business-grid',
    props.moduleKey,
    submittedFilters.value,
    pagination.currentPage,
    pagination.pageSize,
  ]),
  queryFn: () =>
    listBusinessModule(props.moduleKey, submittedFilters.value, {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    }),
  placeholderData: keepPreviousData,
})

const parentListQuery = useQuery({
  queryKey: computed(() => [
    'business-parent-options',
    props.moduleKey,
    parentImportConfig.value?.parentModuleKey || '',
  ]),
  queryFn: () =>
    listBusinessModule(parentImportConfig.value!.parentModuleKey, {}, {
      currentPage: 1,
      pageSize: 200,
    }),
  enabled: computed(() => editorVisible.value && Boolean(parentImportConfig.value?.parentModuleKey)),
  placeholderData: keepPreviousData,
})

const moduleRowsQuery = useQuery({
  queryKey: computed(() => [
    'business-grid-all',
    props.moduleKey,
  ]),
  queryFn: () =>
    listBusinessModule(props.moduleKey, {}, {
      currentPage: 1,
      pageSize: 500,
    }),
  enabled: computed(() => editorVisible.value && Boolean(parentImportConfig.value?.enforceUniqueRelation)),
  placeholderData: keepPreviousData,
})

const materialListQuery = useQuery({
  queryKey: ['business-grid-all', 'materials'],
  queryFn: () =>
    listBusinessModule('materials', {}, {
      currentPage: 1,
      pageSize: 500,
    }),
  enabled: computed(() => editorVisible.value && canEditLineItems.value),
  placeholderData: keepPreviousData,
})

const downstreamSalesOutboundsQuery = useQuery({
  queryKey: ['business-grid-all', 'sales-outbounds', 'editor-lock'],
  queryFn: () =>
    listBusinessModule('sales-outbounds', {}, {
      currentPage: 1,
      pageSize: 500,
    }),
  enabled: computed(() => editorVisible.value && props.moduleKey === 'sales-orders'),
  placeholderData: keepPreviousData,
})

const listResult = computed(() => normalizeTableResponse(listQuery.data.value))
const parentRows = computed(() => normalizeTableResponse(parentListQuery.data.value).rows)
const moduleRows = computed(() => normalizeTableResponse(moduleRowsQuery.data.value).rows)
const materialRows = computed(() => normalizeTableResponse(materialListQuery.data.value).rows)
const downstreamSalesOutbounds = computed(() => normalizeTableResponse(downstreamSalesOutboundsQuery.data.value).rows)
const statusMap = computed(() => config.value.statusMap || {})
const materialMap = computed<Record<string, ModuleRecord>>(() =>
  Object.fromEntries(materialRows.value.map((record) => [String(record.materialCode || ''), record])),
)
const rawColumnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
  Object.fromEntries(config.value.columns.map((column) => [column.dataIndex, column])),
)
const rawFormFieldMetaMap = computed<Record<string, ModuleFormFieldDefinition>>(() =>
  Object.fromEntries(formFields.value.map((field) => [field.key, field])),
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
    width: 172,
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

const expandable = computed(() =>
  config.value.itemColumns?.length
    ? {
        rowExpandable: (record: ModuleRecord) => Boolean(record.items?.length),
      }
    : undefined,
)

const masterTableSummary = computed(() => `共 ${listResult.value.total} 条记录`)

const editorTitle = computed(() => {
  if (editorMode.value === 'edit') {
    return `编辑${config.value.title}`
  }
  return `新增${config.value.title}`
})

const editorItems = computed<ModuleLineItem[]>(() =>
  Array.isArray(editorForm.items) ? (editorForm.items as ModuleLineItem[]) : [],
)

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
  && salesOrderRelatedOutbounds.value.some((record) =>
    ['已审核', '价格核准'].includes(String(record.status || '')),
  ),
)

const editorAuditTarget = computed(() => {
  if (props.moduleKey === 'sales-orders') {
    return {
      key: 'status',
      value: salesOrderLineLocked.value ? '完成销售' : '已审核',
    }
  }

  if (['purchase-orders', 'purchase-inbounds', 'sales-outbounds', 'freight-bills'].includes(props.moduleKey)) {
    return { key: 'status', value: '已审核' }
  }

  const statusField = formFields.value.find((field) => field.key === 'status')
  const statusOptions = (statusField?.options || []).map((option) => String(option.value))
  if (statusOptions.includes('已审核')) {
    return { key: 'status', value: '已审核' }
  }
  if (statusOptions.includes('已核准')) {
    return { key: 'status', value: '已核准' }
  }

  return null
})

const canAuditEditor = computed(() => Boolean(editorAuditTarget.value))
const canManageEditorItems = computed(() =>
  canEditLineItems.value && !(props.moduleKey === 'sales-orders' && salesOrderLineLocked.value),
)

const selectedParentRecord = computed(() =>
  availableParentRows.value.find((record) => record.id === selectedParentId.value)
    || parentRows.value.find((record) => record.id === selectedParentId.value)
    || null,
)

const parentSelectorRows = computed(() => {
  const keyword = parentSelectorKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return availableParentRows.value
  }

  return availableParentRows.value.filter((record) =>
    getParentOptionLabel(record).toLowerCase().includes(keyword),
  )
})

function parseParentRelationNos(value: unknown) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[，,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

const occupiedParentMap = computed<Record<string, ModuleRecord>>(() => {
  if (!parentImportConfig.value?.enforceUniqueRelation) {
    return {}
  }

  return Object.fromEntries(
    moduleRows.value
      .filter((record) => String(record.id) !== String(editorSourceRecordId.value || ''))
      .flatMap((record) =>
        parseParentRelationNos(record[parentImportConfig.value!.parentFieldKey]).map((parentNo) => [parentNo, record] as const),
      ),
  )
})

const availableParentRows = computed(() => {
  if (!parentImportConfig.value?.enforceUniqueRelation) {
    return parentRows.value
  }

  return parentRows.value.filter((record) => !occupiedParentMap.value[getParentRelationNo(record)])
})

watch(
  () => [editorVisible.value, parentRows.value, parentImportConfig.value?.parentFieldKey] as const,
  () => {
    syncSelectedParentRecord()
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

function inferColumnAlign(column?: ModuleColumnDefinition): 'center' {
  void column
  return 'center'
}

function buildDefaultColumnSettingItems() {
  return config.value.columns.map((column) => ({
    key: column.dataIndex,
    title: column.title,
    visible: column.dataIndex !== 'piecesPerBundle',
  }))
}

function buildDefaultFormFieldSettingItems() {
  return formFields.value.map((field) => ({
    key: field.key,
    title: field.label,
    visible: true,
  }))
}

function buildDefaultEditorColumnSettingItems() {
  return (config.value.itemColumns || []).map((column) => ({
    key: column.dataIndex,
    title: column.title,
    visible: column.dataIndex !== 'piecesPerBundle',
  }))
}

function applySavedColumnSettings(
  defaults: Array<{ key: string; title: string; visible: boolean }>,
  saved: ListColumnSettings | null,
) {
  if (!saved) {
    return defaults
  }

  const defaultMap = Object.fromEntries(defaults.map((item) => [item.key, item]))
  const orderedKeys = [
    ...saved.orderedKeys.filter((key) => defaultMap[key]),
    ...defaults.map((item) => item.key).filter((key) => !saved.orderedKeys.includes(key)),
  ]
  const hiddenSet = new Set(saved.hiddenKeys.filter((key) => defaultMap[key]))

  return orderedKeys.map((key) => ({
    ...defaultMap[key],
    visible: !hiddenSet.has(key),
  }))
}

function persistColumnSettings() {
  setListColumnSettings(props.moduleKey, {
    orderedKeys: columnSettingItems.value.map((item) => item.key),
    hiddenKeys: columnSettingItems.value
      .filter((item) => !item.visible)
      .map((item) => item.key),
  })
}

function initColumnSettings() {
  const defaults = buildDefaultColumnSettingItems()
  const saved = getListColumnSettings(props.moduleKey)
  columnSettingItems.value = applySavedColumnSettings(defaults, saved)
}

function persistFormFieldSettings() {
  setListColumnSettings(`${props.moduleKey}:editor-form-fields`, {
    orderedKeys: formFieldSettingItems.value.map((item) => item.key),
    hiddenKeys: formFieldSettingItems.value
      .filter((item) => !item.visible)
      .map((item) => item.key),
  })
}

function initFormFieldSettings() {
  const defaults = buildDefaultFormFieldSettingItems()
  if (!defaults.length) {
    formFieldSettingItems.value = []
    return
  }

  const saved = getListColumnSettings(`${props.moduleKey}:editor-form-fields`)
  formFieldSettingItems.value = applySavedColumnSettings(defaults, saved)
}

function initEditorColumnSettings() {
  const defaults = buildDefaultEditorColumnSettingItems()
  if (!defaults.length) {
    editorColumnSettingItems.value = []
    return
  }

  const saved = getListColumnSettings(`${props.moduleKey}:editor-items`)
  editorColumnSettingItems.value = applySavedColumnSettings(defaults, saved)
}

function handleColumnVisibleChange(key: string, checked: boolean) {
  const visibleCount = columnSettingItems.value.filter((item) => item.visible).length
  const target = columnSettingItems.value.find((item) => item.key === key)
  if (!target) {
    return
  }

  if (!checked && target.visible && visibleCount === 1) {
    message.warning('至少保留一列显示')
    return
  }

  columnSettingItems.value = columnSettingItems.value.map((item) =>
    item.key === key ? { ...item, visible: checked } : item,
  )
  persistColumnSettings()
}

function resetColumnSettings() {
  clearListColumnSettings(props.moduleKey)
  columnSettingItems.value = buildDefaultColumnSettingItems()
}

function handleFormFieldVisibleChange(key: string, checked: boolean) {
  const visibleCount = formFieldSettingItems.value.filter((item) => item.visible).length
  const target = formFieldSettingItems.value.find((item) => item.key === key)
  if (!target) {
    return
  }

  if (!checked && target.visible && visibleCount === 1) {
    message.warning('至少保留一列显示')
    return
  }

  formFieldSettingItems.value = formFieldSettingItems.value.map((item) =>
    item.key === key ? { ...item, visible: checked } : item,
  )
  persistFormFieldSettings()
}

function resetFormFieldSettings() {
  clearListColumnSettings(`${props.moduleKey}:editor-form-fields`)
  formFieldSettingItems.value = buildDefaultFormFieldSettingItems()
}

function persistEditorColumnSettings() {
  setListColumnSettings(`${props.moduleKey}:editor-items`, {
    orderedKeys: editorColumnSettingItems.value.map((item) => item.key),
    hiddenKeys: editorColumnSettingItems.value
      .filter((item) => !item.visible)
      .map((item) => item.key),
  })
}

function handleEditorColumnVisibleChange(key: string, checked: boolean) {
  const visibleCount = editorColumnSettingItems.value.filter((item) => item.visible).length
  const target = editorColumnSettingItems.value.find((item) => item.key === key)
  if (!target) {
    return
  }

  if (!checked && target.visible && visibleCount === 1) {
    message.warning('至少保留一列显示')
    return
  }

  editorColumnSettingItems.value = editorColumnSettingItems.value.map((item) =>
    item.key === key ? { ...item, visible: checked } : item,
  )
  persistEditorColumnSettings()
}

function reorderSettingItems(
  items: Array<{ key: string; title: string; visible: boolean }>,
  sourceKey: string,
  targetKey: string,
  position: 'before' | 'after',
) {
  if (sourceKey === targetKey) {
    return items
  }

  const sourceItem = items.find((item) => item.key === sourceKey)
  if (!sourceItem) {
    return items
  }

  const nextItems = items.filter((item) => item.key !== sourceKey)
  const targetIndex = nextItems.findIndex((item) => item.key === targetKey)
  if (targetIndex < 0) {
    return items
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  return nextItems
}

function resetEditorColumnSettings() {
  clearListColumnSettings(`${props.moduleKey}:editor-items`)
  editorColumnSettingItems.value = buildDefaultEditorColumnSettingItems()
}

function handleSettingDragStart(
  key: string,
  event: DragEvent,
  draggedKey: typeof draggedColumnSettingKey,
  dragOverKey: typeof dragOverColumnSettingKey,
  dragOverPosition: typeof dragOverColumnSettingPosition,
) {
  draggedKey.value = key
  dragOverKey.value = key
  dragOverPosition.value = 'after'

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}

function handleSettingDragOver(
  key: string,
  event: DragEvent,
  draggedKey: typeof draggedColumnSettingKey,
  dragOverKey: typeof dragOverColumnSettingKey,
  dragOverPosition: typeof dragOverColumnSettingPosition,
) {
  if (!draggedKey.value) {
    return
  }

  event.preventDefault()
  const currentTarget = event.currentTarget as HTMLElement | null
  if (currentTarget) {
    const rect = currentTarget.getBoundingClientRect()
    dragOverPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }
  dragOverKey.value = key
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function resetListColumnSettingDragState() {
  draggedColumnSettingKey.value = undefined
  dragOverColumnSettingKey.value = undefined
  dragOverColumnSettingPosition.value = 'after'
}

function resetFormFieldSettingDragState() {
  draggedFormFieldSettingKey.value = undefined
  dragOverFormFieldSettingKey.value = undefined
  dragOverFormFieldSettingPosition.value = 'after'
}

function resetEditorColumnSettingDragState() {
  draggedEditorColumnSettingKey.value = undefined
  dragOverEditorColumnSettingKey.value = undefined
  dragOverEditorColumnSettingPosition.value = 'after'
}

function handleColumnSettingDragStart(key: string, event: DragEvent) {
  handleSettingDragStart(
    key,
    event,
    draggedColumnSettingKey,
    dragOverColumnSettingKey,
    dragOverColumnSettingPosition,
  )
}

function handleColumnSettingDragOver(key: string, event: DragEvent) {
  handleSettingDragOver(
    key,
    event,
    draggedColumnSettingKey,
    dragOverColumnSettingKey,
    dragOverColumnSettingPosition,
  )
}

function handleColumnSettingDrop(key: string) {
  if (!draggedColumnSettingKey.value) {
    return
  }

  columnSettingItems.value = reorderSettingItems(
    columnSettingItems.value,
    draggedColumnSettingKey.value,
    key,
    dragOverColumnSettingPosition.value,
  )
  persistColumnSettings()
  resetListColumnSettingDragState()
}

function getColumnSettingItemClass(key: string) {
  if (!draggedColumnSettingKey.value || dragOverColumnSettingKey.value !== key || draggedColumnSettingKey.value === key) {
    return ''
  }

  return dragOverColumnSettingPosition.value === 'before'
    ? 'column-setting-item-target-before'
    : 'column-setting-item-target-after'
}

function handleFormFieldSettingDragStart(key: string, event: DragEvent) {
  handleSettingDragStart(
    key,
    event,
    draggedFormFieldSettingKey,
    dragOverFormFieldSettingKey,
    dragOverFormFieldSettingPosition,
  )
}

function handleFormFieldSettingDragOver(key: string, event: DragEvent) {
  handleSettingDragOver(
    key,
    event,
    draggedFormFieldSettingKey,
    dragOverFormFieldSettingKey,
    dragOverFormFieldSettingPosition,
  )
}

function handleFormFieldSettingDrop(key: string) {
  if (!draggedFormFieldSettingKey.value) {
    return
  }

  formFieldSettingItems.value = reorderSettingItems(
    formFieldSettingItems.value,
    draggedFormFieldSettingKey.value,
    key,
    dragOverFormFieldSettingPosition.value,
  )
  persistFormFieldSettings()
  resetFormFieldSettingDragState()
}

function getFormFieldSettingItemClass(key: string) {
  if (!draggedFormFieldSettingKey.value || dragOverFormFieldSettingKey.value !== key || draggedFormFieldSettingKey.value === key) {
    return ''
  }

  return dragOverFormFieldSettingPosition.value === 'before'
    ? 'column-setting-item-target-before'
    : 'column-setting-item-target-after'
}

function handleEditorColumnSettingDragStart(key: string, event: DragEvent) {
  handleSettingDragStart(
    key,
    event,
    draggedEditorColumnSettingKey,
    dragOverEditorColumnSettingKey,
    dragOverEditorColumnSettingPosition,
  )
}

function handleEditorColumnSettingDragOver(key: string, event: DragEvent) {
  handleSettingDragOver(
    key,
    event,
    draggedEditorColumnSettingKey,
    dragOverEditorColumnSettingKey,
    dragOverEditorColumnSettingPosition,
  )
}

function handleEditorColumnSettingDrop(key: string) {
  if (!draggedEditorColumnSettingKey.value) {
    return
  }

  editorColumnSettingItems.value = reorderSettingItems(
    editorColumnSettingItems.value,
    draggedEditorColumnSettingKey.value,
    key,
    dragOverEditorColumnSettingPosition.value,
  )
  persistEditorColumnSettings()
  resetEditorColumnSettingDragState()
}

function getEditorColumnSettingItemClass(key: string) {
  if (!draggedEditorColumnSettingKey.value || dragOverEditorColumnSettingKey.value !== key || draggedEditorColumnSettingKey.value === key) {
    return ''
  }

  return dragOverEditorColumnSettingPosition.value === 'before'
    ? 'column-setting-item-target-before'
    : 'column-setting-item-target-after'
}

function sumColumnWidths(columns: ModuleColumnDefinition[]) {
  return columns.reduce((sum, column) => sum + (column.width || 120), 0)
}

function formatAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : '--'
}

function formatWeight(value: unknown) {
  const weight = Number(value)
  return Number.isFinite(weight) ? weight.toFixed(3) : '--'
}

function formatCount(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) ? String(count) : '--'
}

function formatCellValue(column: ModuleColumnDefinition | undefined, value: unknown) {
  if (!column) {
    if (Array.isArray(value)) {
      return value.length ? value.map((item) => String(item)).join('、') : '--'
    }
    return value ? String(value) : '--'
  }
  if (column.type === 'amount') {
    return formatAmount(value)
  }
  if (column.type === 'weight') {
    return formatWeight(value)
  }
  if (column.type === 'count') {
    return formatCount(value)
  }
  if (column.type === 'date') {
    return value ? dayjs(String(value)).format('YYYY-MM-DD') : '--'
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join('、') : '--'
  }
  return value ? String(value) : '--'
}

function formatDetailValue(field: ModuleDetailField, record: ModuleRecord | null) {
  if (!record) {
    return '--'
  }
  const value = record[field.key]
  if (field.type === 'amount') {
    return formatAmount(value)
  }
  if (field.type === 'weight') {
    return formatWeight(value)
  }
  if (field.type === 'count') {
    return formatCount(value)
  }
  if (field.type === 'status') {
    return statusMap.value[String(value || '')]?.text || String(value || '--')
  }
  if (field.type === 'date') {
    return value ? dayjs(String(value)).format('YYYY-MM-DD') : '--'
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join('、') : '--'
  }
  return value ? String(value) : '--'
}

function getStatusMeta(value: unknown) {
  return statusMap.value[String(value || '')] || {
    text: String(value || '--'),
    color: 'default',
  }
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

async function persistModuleRecord(record: ModuleRecord) {
  const response = await saveBusinessModule(props.moduleKey, record)
  if (response.code !== 200) {
    throw new Error(response.message || '保存失败')
  }

  await refreshModuleQueries()
  return response.data || record
}

function buildAttachmentItems(record: ModuleRecord | null) {
  if (!record) {
    return []
  }

  const rawAttachments = Array.isArray(record.attachments) ? record.attachments : []
  if (rawAttachments.length) {
    return rawAttachments.map((item, index) => ({
      id: String(item.id || `attachment-${index + 1}`),
      name: String(item.name || item.fileName || `附件${index + 1}`),
      uploader: String(item.uploader || item.operatorName || getCurrentOperatorName()),
      uploadTime: String(item.uploadTime || item.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss')),
    }))
  }

  return String(record.attachment || '')
    .split(/[，,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `attachment-${index + 1}`,
      name,
      uploader: getCurrentOperatorName(),
      uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }))
}

const attachmentRows = computed(() => buildAttachmentItems(attachmentRecord.value))
const supplierStatementSelectedInbounds = computed(() =>
  supplierStatementCandidateRows.value.filter((record) =>
    supplierStatementSelectedInboundKeys.value.includes(String(record.id)),
  ),
)
const supplierStatementSelectedSupplierName = computed(() =>
  String(supplierStatementSelectedInbounds.value[0]?.supplierName || ''),
)
const customerStatementSelectedOrders = computed(() =>
  customerStatementCandidateRows.value.filter((record) =>
    customerStatementSelectedOrderKeys.value.includes(String(record.id)),
  ),
)
const customerStatementSelectedCustomerName = computed(() =>
  String(customerStatementSelectedOrders.value[0]?.customerName || ''),
)
const customerStatementSelectedProjectName = computed(() =>
  String(customerStatementSelectedOrders.value[0]?.projectName || ''),
)
const freightStatementSelectedBills = computed(() =>
  freightStatementCandidateRows.value.filter((record) =>
    freightStatementSelectedBillKeys.value.includes(String(record.id)),
  ),
)
const freightStatementSelectedCarrierName = computed(() =>
  String(freightStatementSelectedBills.value[0]?.carrierName || ''),
)

function closeAttachmentDialog() {
  attachmentVisible.value = false
  attachmentSaving.value = false
  attachmentDraftName.value = ''
  attachmentRecord.value = null
}

function closeSupplierStatementGenerator() {
  supplierStatementGeneratorVisible.value = false
  supplierStatementGeneratorLoading.value = false
  supplierStatementCandidateRows.value = []
  supplierStatementSelectedInboundKeys.value = []
}

function closeCustomerStatementGenerator() {
  customerStatementGeneratorVisible.value = false
  customerStatementGeneratorLoading.value = false
  customerStatementCandidateRows.value = []
  customerStatementSelectedOrderKeys.value = []
}

function closeFreightStatementGenerator() {
  freightStatementGeneratorVisible.value = false
  freightStatementGeneratorLoading.value = false
  freightStatementCandidateRows.value = []
  freightStatementSelectedBillKeys.value = []
}

async function saveAttachmentList(nextAttachments: AttachmentItem[]) {
  if (!attachmentRecord.value) {
    return
  }

  attachmentSaving.value = true
  try {
    const nextRecord: ModuleRecord = {
      ...cloneRecord(attachmentRecord.value),
      attachments: nextAttachments,
      attachment: nextAttachments.map((item) => item.name).join(', '),
    }
    const savedRecord = await persistModuleRecord(nextRecord)
    attachmentRecord.value = savedRecord
    if (activeRecord.value?.id === savedRecord.id) {
      activeRecord.value = savedRecord
    }
  } finally {
    attachmentSaving.value = false
  }
}

async function handleAddAttachment() {
  const name = attachmentDraftName.value.trim()
  if (!name) {
    message.warning('请先输入附件名称')
    return
  }

  try {
    await saveAttachmentList([
      ...attachmentRows.value,
      {
        id: `attachment-${Date.now()}`,
        name,
        uploader: getCurrentOperatorName(),
        uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      },
    ])
    attachmentDraftName.value = ''
    message.success('附件已保存到 mock 数据')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件保存失败')
  }
}

async function handleRemoveAttachment(attachmentId: string) {
  try {
    await saveAttachmentList(attachmentRows.value.filter((item) => item.id !== attachmentId))
    message.success('附件已删除')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件删除失败')
  }
}

async function openFreightSummary() {
  freightSummaryLoading.value = true
  try {
    const response = await listBusinessModule(props.moduleKey, submittedFilters.value, {
      currentPage: 1,
      pageSize: Math.max(listResult.value.total || 0, 500),
    })
    const rows = normalizeTableResponse(response).rows
    if (!rows.length) {
      message.warning('当前筛选条件下没有可汇总的数据')
      return
    }

    const summaryMap: Record<string, FreightSummaryRow> = {}
    rows.forEach((record) => {
      const carrierName = String(record.carrierName || '未设置物流商')
      if (!summaryMap[carrierName]) {
        summaryMap[carrierName] = {
          id: carrierName,
          carrierName,
          statementCount: 0,
          totalWeight: 0,
          totalFreight: 0,
          paidAmount: 0,
          unpaidAmount: 0,
        }
      }

      summaryMap[carrierName].statementCount += 1
      summaryMap[carrierName].totalWeight += Number(record.totalWeight || 0)
      summaryMap[carrierName].totalFreight += Number(record.totalFreight || 0)
      summaryMap[carrierName].paidAmount += Number(record.paidAmount || 0)
      summaryMap[carrierName].unpaidAmount += Number(record.unpaidAmount || 0)
    })

    freightSummaryRows.value = Object.values(summaryMap).map((item) => ({
      ...item,
      totalWeight: Number(item.totalWeight.toFixed(3)),
      totalFreight: Number(item.totalFreight.toFixed(2)),
      paidAmount: Number(item.paidAmount.toFixed(2)),
      unpaidAmount: Number(item.unpaidAmount.toFixed(2)),
    }))
    freightSummaryVisible.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '汇总加载失败')
  } finally {
    freightSummaryLoading.value = false
  }
}

async function openSupplierStatementGenerator() {
  supplierStatementGeneratorLoading.value = true
  supplierStatementSelectedInboundKeys.value = []
  supplierStatementGeneratorVisible.value = true

  try {
    const [inboundResponse, statementResponse] = await Promise.all([
      listBusinessModule('purchase-inbounds', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
      listBusinessModule('supplier-statements', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
    ])

    const inbounds = normalizeTableResponse(inboundResponse).rows
    const statements = normalizeTableResponse(statementResponse).rows
    const occupiedInboundNoSet = new Set(
      statements.flatMap((record) => parseParentRelationNos(record.sourceInboundNos)),
    )

    supplierStatementCandidateRows.value = inbounds.filter((record) => {
      const inboundNo = String(record.inboundNo || '')
      return inboundNo
        && String(record.status || '') !== '草稿'
        && !occupiedInboundNoSet.has(inboundNo)
    })

    if (!supplierStatementCandidateRows.value.length) {
      message.warning('没有可生成对账单的采购入库单')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '采购入库单加载失败')
    closeSupplierStatementGenerator()
  } finally {
    supplierStatementGeneratorLoading.value = false
  }
}

async function openCustomerStatementGenerator() {
  customerStatementGeneratorLoading.value = true
  customerStatementSelectedOrderKeys.value = []
  customerStatementGeneratorVisible.value = true

  try {
    const [orderResponse, statementResponse] = await Promise.all([
      listBusinessModule('sales-orders', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
      listBusinessModule('customer-statements', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
    ])

    const orders = normalizeTableResponse(orderResponse).rows
    const statements = normalizeTableResponse(statementResponse).rows
    const occupiedOrderNoSet = new Set(
      statements.flatMap((record) => parseParentRelationNos(record.sourceOrderNos)),
    )

    customerStatementCandidateRows.value = orders.filter((record) => {
      const orderNo = String(record.orderNo || '')
      return orderNo
        && String(record.status || '') === '完成销售'
        && !occupiedOrderNoSet.has(orderNo)
    })

    if (!customerStatementCandidateRows.value.length) {
      message.warning('没有可生成对账单的销售订单')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '销售订单加载失败')
    closeCustomerStatementGenerator()
  } finally {
    customerStatementGeneratorLoading.value = false
  }
}

async function openFreightStatementGenerator() {
  freightStatementGeneratorLoading.value = true
  freightStatementSelectedBillKeys.value = []
  freightStatementGeneratorVisible.value = true

  try {
    const [billResponse, statementResponse] = await Promise.all([
      listBusinessModule('freight-bills', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
      listBusinessModule('freight-statements', {}, {
        currentPage: 1,
        pageSize: 500,
      }),
    ])

    const bills = normalizeTableResponse(billResponse).rows
    const statements = normalizeTableResponse(statementResponse).rows
    const occupiedBillNoSet = new Set(
      statements.flatMap((record) => parseParentRelationNos(record.sourceBillNos)),
    )

    freightStatementCandidateRows.value = bills.filter((record) => {
      const billNo = String(record.billNo || '')
      return billNo && !occupiedBillNoSet.has(billNo)
    })

    if (!freightStatementCandidateRows.value.length) {
      message.warning('没有可生成对账单的物流单')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '物流单加载失败')
    closeFreightStatementGenerator()
  } finally {
    freightStatementGeneratorLoading.value = false
  }
}

async function buildSupplierStatementDraft(sourceInbounds: ModuleRecord[]) {
  const baseDraft = buildEditorDraft('create') as ModuleRecord
  const sortedInbounds = cloneRecord(sourceInbounds).sort((left, right) =>
    dayjs(String(left.inboundDate || '')).valueOf() - dayjs(String(right.inboundDate || '')).valueOf(),
  )
  const firstInbound = sortedInbounds[0]
  const sourceInboundNos = sortedInbounds.map((record) => String(record.inboundNo || '')).filter(Boolean).join(', ')
  const startDate = String(sortedInbounds[0]?.inboundDate || dayjs().format('YYYY-MM-DD'))
  const endDate = String(sortedInbounds[sortedInbounds.length - 1]?.inboundDate || dayjs().format('YYYY-MM-DD'))
  const purchaseAmount = Number(sortedInbounds.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0).toFixed(2))

  const paymentResponse = await listBusinessModule('payments', {}, {
    currentPage: 1,
    pageSize: 500,
  })
  const payments = normalizeTableResponse(paymentResponse).rows
  const paymentAmount = Number(
    payments
      .filter((record) => {
        const paymentDate = dayjs(String(record.paymentDate || ''))
        return record.businessType === '供应商'
          && String(record.counterpartyName || '') === String(firstInbound?.supplierName || '')
          && String(record.status || '') === '已付款'
          && (
            paymentDate.isAfter(dayjs(startDate).startOf('day'))
            || paymentDate.isSame(dayjs(startDate).startOf('day'))
          )
          && (
            paymentDate.isBefore(dayjs(endDate).endOf('day'))
            || paymentDate.isSame(dayjs(endDate).endOf('day'))
          )
      })
      .reduce((sum, record) => sum + Number(record.amount || 0), 0)
      .toFixed(2),
  )

  return {
    ...baseDraft,
    supplierName: firstInbound?.supplierName || '',
    startDate,
    endDate,
    purchaseAmount,
    paymentAmount,
    closingAmount: Number((purchaseAmount - paymentAmount).toFixed(2)),
    sourceInboundNos,
    remark: `由采购入库单 ${sourceInboundNos} 生成`,
  }
}

function buildCustomerStatementDraft(sourceOrders: ModuleRecord[]) {
  const baseDraft = buildEditorDraft('create') as ModuleRecord
  const sortedOrders = cloneRecord(sourceOrders).sort((left, right) =>
    dayjs(String(left.orderDate || '')).valueOf() - dayjs(String(right.orderDate || '')).valueOf(),
  )
  const firstOrder = sortedOrders[0]
  const sourceOrderNos = sortedOrders.map((order) => String(order.orderNo || '')).filter(Boolean).join(', ')
  const salesAmount = Number(sortedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0).toFixed(2))

  return {
    ...baseDraft,
    customerName: firstOrder?.customerName || '',
    projectName: firstOrder?.projectName || '',
    startDate: String(sortedOrders[0]?.orderDate || dayjs().format('YYYY-MM-DD')),
    endDate: String(sortedOrders[sortedOrders.length - 1]?.orderDate || dayjs().format('YYYY-MM-DD')),
    salesAmount,
    receiptAmount: 0,
    closingAmount: salesAmount,
    sourceOrderNos,
    remark: `由销售订单 ${sourceOrderNos} 生成`,
  }
}

function buildFreightStatementDraft(sourceBills: ModuleRecord[]) {
  const baseDraft = buildEditorDraft('create') as ModuleRecord
  const sortedBills = cloneRecord(sourceBills).sort((left, right) =>
    dayjs(String(left.billTime || '')).valueOf() - dayjs(String(right.billTime || '')).valueOf(),
  )
  const firstBill = sortedBills[0]
  const statementItems = sortedBills.flatMap((bill) =>
    cloneLineItems(bill.items).map((item) => ({
      ...item,
      id: buildEditorItemId(),
      sourceBillNo: bill.billNo || '',
    })),
  )
  const sourceBillNos = sortedBills.map((bill) => String(bill.billNo || '')).filter(Boolean).join(', ')
  const totalWeight = Number(sortedBills.reduce((sum, bill) => sum + Number(bill.totalWeight || 0), 0).toFixed(3))
  const totalFreight = Number(sortedBills.reduce((sum, bill) => sum + Number(bill.totalFreight || 0), 0).toFixed(2))

  return {
    ...baseDraft,
    carrierName: firstBill?.carrierName || '',
    startDate: String(sortedBills[0]?.billTime || dayjs().format('YYYY-MM-DD')),
    endDate: String(sortedBills[sortedBills.length - 1]?.billTime || dayjs().format('YYYY-MM-DD')),
    totalWeight,
    totalFreight,
    paidAmount: 0,
    unpaidAmount: totalFreight,
    status: '待审核',
    signStatus: '未签署',
    sourceBillNos,
    attachment: '',
    attachments: [],
    remark: `由物流单 ${sourceBillNos} 生成`,
    items: statementItems,
  }
}

function handleSupplierStatementGeneratorSelection(keys: Array<string | number>) {
  supplierStatementSelectedInboundKeys.value = keys.map((key) => String(key))
}

function handleCustomerStatementGeneratorSelection(keys: Array<string | number>) {
  customerStatementSelectedOrderKeys.value = keys.map((key) => String(key))
}

function handleFreightStatementGeneratorSelection(keys: Array<string | number>) {
  freightStatementSelectedBillKeys.value = keys.map((key) => String(key))
}

function handleGenerateCustomerStatement() {
  if (!customerStatementSelectedOrders.value.length) {
    message.warning('请先选择销售订单')
    return
  }

  const customerNames = Array.from(
    new Set(customerStatementSelectedOrders.value.map((record) => String(record.customerName || ''))),
  )
  const projectNames = Array.from(
    new Set(customerStatementSelectedOrders.value.map((record) => String(record.projectName || ''))),
  )
  if (customerNames.length !== 1 || projectNames.length !== 1) {
    message.warning('仅支持同一客户同一项目的销售订单合并生成')
    return
  }

  editorMode.value = 'create'
  editorSourceRecordId.value = ''
  selectedParentId.value = undefined
  parentSelectorVisible.value = false
  parentSelectorKeyword.value = ''
  resetReactiveObject(editorForm, buildCustomerStatementDraft(customerStatementSelectedOrders.value))
  editorVisible.value = true
  closeCustomerStatementGenerator()
}

async function handleGenerateSupplierStatement() {
  if (!supplierStatementSelectedInbounds.value.length) {
    message.warning('请先选择采购入库单')
    return
  }

  const supplierNames = Array.from(
    new Set(supplierStatementSelectedInbounds.value.map((record) => String(record.supplierName || ''))),
  )
  if (supplierNames.length !== 1) {
    message.warning('仅支持同一供应商的采购入库单合并生成')
    return
  }

  try {
    editorMode.value = 'create'
    editorSourceRecordId.value = ''
    selectedParentId.value = undefined
    parentSelectorVisible.value = false
    parentSelectorKeyword.value = ''
    resetReactiveObject(editorForm, await buildSupplierStatementDraft(supplierStatementSelectedInbounds.value))
    editorVisible.value = true
    closeSupplierStatementGenerator()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '供应商对账单草稿生成失败')
  }
}

function handleGenerateFreightStatement() {
  if (!freightStatementSelectedBills.value.length) {
    message.warning('请先选择物流单')
    return
  }

  const carrierNames = Array.from(
    new Set(freightStatementSelectedBills.value.map((record) => String(record.carrierName || ''))),
  )
  if (carrierNames.length !== 1) {
    message.warning('仅支持同一物流商的物流单合并生成')
    return
  }

  editorMode.value = 'create'
  editorSourceRecordId.value = ''
  selectedParentId.value = undefined
  parentSelectorVisible.value = false
  parentSelectorKeyword.value = ''
  resetReactiveObject(editorForm, buildFreightStatementDraft(freightStatementSelectedBills.value))
  editorVisible.value = true
  closeFreightStatementGenerator()
}

async function markSelectedFreightDelivered() {
  const selectedRecords = selectedRowKeys.value
    .map((key) => selectedRowMap.value[key])
    .filter(Boolean)

  if (!selectedRecords.length) {
    message.warning('请先勾选需要标记送达的物流单')
    return
  }

  try {
    await Promise.all(
      selectedRecords.map((record) =>
        persistModuleRecord({
          ...cloneRecord(record),
          deliveryStatus: '已送达',
          status: String(record.status || '') === '未审核' ? '已审核' : record.status,
        }),
      ),
    )
    selectedRowKeys.value = []
    selectedRowMap.value = {}
    message.success(`已更新 ${selectedRecords.length} 张物流单`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批量更新失败')
  }
}

async function handleAction(actionLabel: string) {
  if (props.moduleKey === 'supplier-statements' && actionLabel === '生成对账单') {
    await openSupplierStatementGenerator()
    return
  }

  if (props.moduleKey === 'customer-statements' && actionLabel === '生成对账单') {
    await openCustomerStatementGenerator()
    return
  }

  if (props.moduleKey === 'freight-statements' && actionLabel === '生成物流对账单') {
    await openFreightStatementGenerator()
    return
  }

  if ((actionLabel.includes('新增') || actionLabel.includes('生成')) && formFields.value.length) {
    openCreateEditor()
    return
  }

  if (actionLabel.includes('导出')) {
    await exportRows('filtered')
    return
  }

  if (props.moduleKey === 'freight-bills' && actionLabel === '标记送达') {
    await markSelectedFreightDelivered()
    return
  }

  if (props.moduleKey === 'freight-statements' && actionLabel === '查看运费对账汇总') {
    await openFreightSummary()
    return
  }

  message.info(`${actionLabel} 当前没有额外的 mock 处理逻辑。`)
}

function formatExportCellValue(column: ModuleColumnDefinition, value: unknown) {
  if (column.type === 'status') {
    return getStatusMeta(value).text
  }

  const rendered = formatCellValue(column, value)
  return rendered === '--' ? '' : String(rendered)
}

async function exportRows(mode: 'selected' | 'page' | 'filtered') {
  if (mode === 'filtered') {
    const response = await listBusinessModule(props.moduleKey, submittedFilters.value, {
      currentPage: 1,
      pageSize: Math.max(listResult.value.total || 0, 200),
    })
    const filteredRows = normalizeTableResponse(response).rows
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

async function handleExportMenuClick(info: { key: string }) {
  exportLoading.value = true
  try {
    if (info.key === 'selected' || info.key === 'page' || info.key === 'filtered') {
      await exportRows(info.key)
    }
  } finally {
    exportLoading.value = false
  }
}

function handleTableChange(page: { current?: number; pageSize?: number }) {
  pagination.currentPage = page.current || 1
  pagination.pageSize = page.pageSize || 20
}

function handleView(record: ModuleRecord) {
  activeRecord.value = record
  detailVisible.value = true
}

function handleEdit(record: ModuleRecord) {
  if (!formFields.value.length) {
    handleView(record)
    return
  }

  editorMode.value = 'edit'
  editorSourceRecordId.value = String(record.id || '')
  selectedParentId.value = undefined
  parentSelectorVisible.value = false
  parentSelectorKeyword.value = ''
  resetReactiveObject(editorForm, buildEditorDraft('edit', record))
  editorVisible.value = true
}

async function handleDelete(record: ModuleRecord) {
  try {
    const response = await deleteBusinessModule(props.moduleKey, String(record.id))
    if (response.code !== 200) {
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
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

function handleAttachment(record: ModuleRecord) {
  attachmentRecord.value = cloneRecord(record)
  attachmentDraftName.value = ''
  attachmentVisible.value = true
}

function handleCloseDetail() {
  detailVisible.value = false
}

function buildDetailPrintHtml(record: ModuleRecord) {
  const fields = config.value.detailFields.map((field) => ({
    label: field.label,
    value: String(formatDetailValue(field, record)),
  }))
  const columns = (config.value.itemColumns || []).map((column) => ({
    title: column.title,
    align: inferColumnAlign(column),
  }))
  const rows = (record.items || []).map((item) =>
    (config.value.itemColumns || []).map((column) =>
      String(formatCellValue(column, item[column.dataIndex])),
    ),
  )

  return buildModulePrintHtml({
    title: `${config.value.title}打印单`,
    subtitle: getPrimaryNo(record),
    fields,
    columns,
    rows,
  })
}

function buildPrintContext(record: ModuleRecord) {
  const model = cloneRecord(record) as Record<string, unknown>
  const details = cloneLineItems(record.items) as Array<Record<string, unknown>>
  return {
    model,
    details,
  }
}

async function handlePrintDetail(preview: boolean) {
  if (!activeRecord.value) {
    return
  }

  detailPrintLoading.value = true
  try {
    const loaded = await loadCLodop()
    if (!loaded) {
      message.warning('未检测到 CLodop，本机安装并启动 CLodop 后再试')
      return
    }

    const printTitle = `${config.value.title}-${getPrimaryNo(activeRecord.value)}`
    let templateContent = ''
    try {
      const templateResponse = await getDefaultPrintTemplate(props.moduleKey)
      templateContent = String(templateResponse.data?.templateHtml || '').trim()
    } catch {
      templateContent = ''
    }

    let success = false
    if (templateContent) {
      const { model, details } = buildPrintContext(activeRecord.value)
      const rendered = renderPrintTemplate(templateContent, model, details)
      success = isCLodopCode(templateContent)
        ? execPrintCode(rendered, { preview, title: printTitle })
        : printHtml(rendered, { preview, title: printTitle })
    } else {
      success = printHtml(buildDetailPrintHtml(activeRecord.value), {
        preview,
        title: printTitle,
      })
    }

    if (!success) {
      message.error('CLodop 打印调用失败，请检查本机打印服务状态')
    }
  } finally {
    detailPrintLoading.value = false
  }
}

function closeEditor() {
  editorVisible.value = false
  editorSaving.value = false
  editorSourceRecordId.value = ''
  selectedParentId.value = undefined
  parentSelectorVisible.value = false
  parentSelectorKeyword.value = ''
  resetReactiveObject(editorForm, {})
}

function openCreateEditor() {
  editorMode.value = 'create'
  editorSourceRecordId.value = ''
  selectedParentId.value = undefined
  parentSelectorVisible.value = false
  parentSelectorKeyword.value = ''
  resetReactiveObject(editorForm, buildEditorDraft('create'))
  editorVisible.value = true
}

function buildEditorDraft(mode: 'create' | 'edit', sourceRecord?: ModuleRecord) {
  const baseDraft = buildDefaultEditorDraft()

  if (!sourceRecord) {
    return baseDraft
  }

  const sourceDraft = cloneRecord(sourceRecord)
  const mergedDraft: Record<string, unknown> = {
    ...baseDraft,
    ...sourceDraft,
    items: cloneLineItems(sourceRecord.items),
  }

  if (mode === 'edit') {
    return mergedDraft
  }

  if (config.value.primaryNoKey) {
    mergedDraft[config.value.primaryNoKey] = generatePrimaryNo()
  }

  mergedDraft.id = ''
  formFields.value
    .filter((field) => field.type === 'date')
    .forEach((field) => {
      mergedDraft[field.key] = baseDraft[field.key]
    })
  formFields.value
    .filter((field) => field.defaultValue !== undefined)
    .forEach((field) => {
      mergedDraft[field.key] = field.defaultValue
    })

  return mergedDraft
}

function buildDefaultEditorDraft() {
  const draft: Record<string, unknown> = {
    items: [],
  }

  formFields.value.forEach((field) => {
    draft[field.key] = getDefaultFieldValue(field)
  })

  if (config.value.primaryNoKey && !draft[config.value.primaryNoKey]) {
    draft[config.value.primaryNoKey] = generatePrimaryNo()
  }

  if (props.moduleKey === 'carriers') {
    draft.priceMode = '按吨'
  }

  if (props.moduleKey === 'purchase-orders') {
    draft.buyerName = getCurrentOperatorName()
  }

  if (props.moduleKey === 'receipts' || props.moduleKey === 'payments') {
    draft.operatorName = getCurrentOperatorName()
  }

  return draft
}

function getCurrentOperatorName() {
  const user = getStoredUser()
  return String(user?.username || user?.loginName || '当前用户')
}

function getDefaultFieldValue(field: ModuleFormFieldDefinition) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue
  }
  if (field.type === 'multiSelect') {
    return []
  }
  if (field.type === 'date') {
    return dayjs().format('YYYY-MM-DD')
  }
  if (field.type === 'number') {
    return 0
  }
  return ''
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneLineItems(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return cloneRecord(value) as ModuleLineItem[]
}

function generatePrimaryNo() {
  const serial = String(Date.now()).slice(-6)
  const year = dayjs().format('YYYY')
  const prefixMap: Record<string, string> = {
    'purchase-orders': 'CG',
    'purchase-inbounds': 'RK',
    'sales-orders': 'XS',
    'sales-outbounds': 'CK',
    'freight-bills': 'W',
    'purchase-contracts': 'CGHT',
    'sales-contracts': 'XSHT',
    'supplier-statements': 'GYDZ',
    'customer-statements': 'KHDZ',
    'freight-statements': 'WDZ',
    receipts: 'SK',
    payments: 'FK',
  }

  return `${year}${prefixMap[props.moduleKey] || 'NO'}${serial}`
}

function getPrimaryNo(record: ModuleRecord) {
  const configuredKey = config.value.primaryNoKey
  if (configuredKey && record[configuredKey]) {
    return String(record[configuredKey])
  }

  const firstNoField = [
    'orderNo',
    'inboundNo',
    'outboundNo',
    'billNo',
    'settingCode',
    'permissionCode',
    'loginName',
    'roleCode',
    'ticketNo',
    'statementNo',
    'receiptNo',
    'paymentNo',
    'materialCode',
  ].find((key) => record[key])
  return firstNoField ? String(record[firstNoField]) : String(record.id)
}

function getRowClassName(record: ModuleRecord) {
  const status = String(record.status || '')
  return config.value.rowHighlightStatuses?.includes(status) ? 'table-row-emphasis' : ''
}

function getParentRecordLabel(record: ModuleRecord) {
  const primaryNo = parentImportConfig.value
    ? String(record[parentImportConfig.value.parentDisplayFieldKey] || record.id)
    : getPrimaryNo(record)
  const extras = [
    record.customerName,
    record.supplierName,
    record.projectName,
    record.warehouseName,
  ]
    .filter(Boolean)
    .map((item) => String(item))

  return [primaryNo, ...extras.slice(0, 2)].join(' / ')
}

function getParentRelationNo(record: ModuleRecord) {
  if (!parentImportConfig.value) {
    return ''
  }

  return String(record[parentImportConfig.value.parentDisplayFieldKey] || '')
}

function getParentOptionLabel(parentRecord: ModuleRecord) {
  return getParentRecordLabel(parentRecord)
}

function openParentSelector() {
  parentSelectorKeyword.value = ''
  parentSelectorVisible.value = true
}

function closeParentSelector() {
  parentSelectorVisible.value = false
}

function getParentSelectorRowProps(record: ModuleRecord) {
  return {
    onDblclick: () => {
      selectedParentId.value = String(record.id)
      handleImportParentItems(record)
    },
  }
}

function syncSelectedParentRecord() {
  if (!editorVisible.value || !parentImportConfig.value || selectedParentId.value || !parentRows.value.length) {
    return
  }

  const currentParentNos = parseParentRelationNos(editorForm[parentImportConfig.value.parentFieldKey])
  if (currentParentNos.length !== 1) {
    return
  }

  const matchedParent = parentRows.value.find(
    (record) =>
      String(record[parentImportConfig.value!.parentDisplayFieldKey] || '') === currentParentNos[0],
  )

  if (matchedParent) {
    selectedParentId.value = matchedParent.id
  }
}

function handleImportParentItems(targetParentRecord?: ModuleRecord) {
  if (!parentImportConfig.value) {
    return
  }

  const parentRecord = targetParentRecord || selectedParentRecord.value
  if (!parentRecord) {
    message.warning('请先选择上级单据')
    return
  }

  if (parentImportConfig.value.enforceUniqueRelation && occupiedParentMap.value[getParentRelationNo(parentRecord)]) {
    message.warning(`${parentImportConfig.value.label}已被其他单据占用，请重新选择`)
    return
  }

  const parentNo = String(parentRecord[parentImportConfig.value.parentDisplayFieldKey] || '')
  const currentParentNos = parseParentRelationNos(editorForm[parentImportConfig.value.parentFieldKey])
  const hasImportedCurrentParent = currentParentNos.includes(parentNo)
  const mergedParentNos = hasImportedCurrentParent
    ? currentParentNos
    : [...currentParentNos, parentNo]

  editorForm[parentImportConfig.value.parentFieldKey] = mergedParentNos.join(', ')

  const mappedValues = parentImportConfig.value.mapParentToDraft?.(parentRecord) || {}
  if (!currentParentNos.length || (currentParentNos.length === 1 && hasImportedCurrentParent)) {
    Object.assign(editorForm, mappedValues)
  }

  const existingItems = cloneRecord(editorItems.value)
  if (parentImportConfig.value.transformItems) {
    editorForm.items = parentImportConfig.value.transformItems(parentRecord)
  } else if (Array.isArray(parentRecord.items)) {
    editorForm.items = cloneLineItems(parentRecord.items)
  }
  const importedItems = cloneRecord(Array.isArray(editorForm.items) ? editorForm.items : []).map((item) => ({
    ...item,
    _parentRelationNo: parentNo,
  }))
  editorForm.items = hasImportedCurrentParent
    ? [
        ...existingItems.filter((item) => String(item._parentRelationNo || '') !== parentNo),
        ...importedItems,
      ]
    : [
        ...existingItems,
        ...importedItems,
      ]

  closeParentSelector()
  message.success(hasImportedCurrentParent ? `${parentImportConfig.value.label}明细已更新` : `${parentImportConfig.value.label}明细已追加`)
}

function hasEditorValue(value: unknown) {
  if (value === undefined || value === null) {
    return false
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

function validateEditorForm() {
  for (const field of formFields.value) {
    if (field.required && !hasEditorValue(editorForm[field.key])) {
      message.warning(`请填写${field.label}`)
      return false
    }
  }

  if (config.value.itemColumns?.length && editorItems.value.length === 0) {
    message.warning('请至少填写一条明细')
    return false
  }

  if (parentImportConfig.value?.enforceUniqueRelation) {
    const parentNos = parseParentRelationNos(editorForm[parentImportConfig.value.parentFieldKey])
    for (const parentNo of parentNos) {
      if (occupiedParentMap.value[parentNo]) {
        message.warning(`${parentImportConfig.value.label}已被${getPrimaryNo(occupiedParentMap.value[parentNo])}关联`)
        return false
      }
    }
  }

  return true
}

function sumLineItemsBy(items: ModuleLineItem[], key: string) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

function buildEditorItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function updateEditorItems(nextItems: ModuleLineItem[]) {
  editorForm.items = nextItems
}

function resetEditorItemDragState() {
  draggedEditorItemId.value = undefined
  dragOverEditorItemId.value = undefined
  dragOverEditorItemPosition.value = 'after'
}

function addEditorItem() {
  const nextItems = [
    ...editorItems.value,
    {
      id: buildEditorItemId(),
      materialCode: '',
      brand: '',
      category: '',
      material: '',
      spec: '',
      length: '',
      unit: '吨',
      pieceWeightTon: 0,
      piecesPerBundle: 0,
      quantity: 0,
      weightTon: 0,
      unitPrice: 0,
      amount: 0,
    },
  ]
  updateEditorItems(nextItems)
}

function removeEditorItem(itemId: string) {
  updateEditorItems(editorItems.value.filter((item) => String(item.id) !== itemId))
}

function handleEditorItemDragStart(itemId: string, event: DragEvent) {
  draggedEditorItemId.value = itemId
  dragOverEditorItemId.value = itemId
  dragOverEditorItemPosition.value = 'after'

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
  }
}

function handleEditorItemDragEnd() {
  resetEditorItemDragState()
}

function getEditorItemRowClassName(record: ModuleLineItem) {
  const recordId = String(record.id)
  if (!draggedEditorItemId.value || dragOverEditorItemId.value !== recordId || draggedEditorItemId.value === recordId) {
    return ''
  }

  return dragOverEditorItemPosition.value === 'before'
    ? 'editor-draggable-row-target-before'
    : 'editor-draggable-row-target-after'
}

function moveEditorItemByDrag(targetId: string) {
  const sourceId = draggedEditorItemId.value
  if (!sourceId || sourceId === targetId) {
    resetEditorItemDragState()
    return
  }

  const sourceItem = editorItems.value.find((item) => String(item.id) === sourceId)
  if (!sourceItem) {
    resetEditorItemDragState()
    return
  }

  const nextItems = editorItems.value.filter((item) => String(item.id) !== sourceId)
  const targetIndex = nextItems.findIndex((item) => String(item.id) === targetId)
  if (targetIndex < 0) {
    resetEditorItemDragState()
    return
  }

  const insertIndex = dragOverEditorItemPosition.value === 'before' ? targetIndex : targetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  updateEditorItems(nextItems)
  resetEditorItemDragState()
}

function getEditorItemRowProps(record: ModuleLineItem) {
  if (!canManageEditorItems.value) {
    return {}
  }

  const recordId = String(record.id)
  return {
    onDragover: (event: DragEvent) => {
      if (!draggedEditorItemId.value) {
        return
      }

      event.preventDefault()
      const currentTarget = event.currentTarget as HTMLElement | null
      if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect()
        dragOverEditorItemPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
      }
      dragOverEditorItemId.value = recordId
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      moveEditorItemByDrag(recordId)
    },
  }
}

function toRoundedNumber(value: unknown, precision: number) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }
  return Number(numericValue.toFixed(precision))
}

function recalculateLineItem(item: ModuleLineItem, changedKey?: string) {
  if (changedKey === 'quantity' || changedKey === 'pieceWeightTon') {
    item.weightTon = toRoundedNumber(Number(item.quantity || 0) * Number(item.pieceWeightTon || 0), 3)
  }

  if (changedKey === 'amount' && Number(item.weightTon || 0) > 0) {
    item.unitPrice = toRoundedNumber(Number(item.amount || 0) / Number(item.weightTon || 0), 2)
    return
  }

  if (
    changedKey === 'quantity'
    || changedKey === 'pieceWeightTon'
    || changedKey === 'weightTon'
    || changedKey === 'unitPrice'
  ) {
    item.amount = toRoundedNumber(Number(item.weightTon || 0) * Number(item.unitPrice || 0), 2)
  }
}

function handleEditorItemNumberChange(item: ModuleLineItem, key: string, value: number | null) {
  item[key] = value ?? 0
  recalculateLineItem(item, key)
}

function handleEditorItemTextChange(item: ModuleLineItem, key: string, value: string) {
  item[key] = value
}

function handleEditorItemMaterialChange(item: ModuleLineItem, materialCode: string) {
  item.materialCode = materialCode
  const materialRecord = materialMap.value[materialCode]
  if (!materialRecord) {
    return
  }

  item.brand = materialRecord.brand || ''
  item.category = materialRecord.category || ''
  item.material = materialRecord.material || ''
  item.spec = materialRecord.spec || ''
  item.length = materialRecord.length || ''
  item.unit = materialRecord.unit || '吨'
  item.pieceWeightTon = toRoundedNumber(materialRecord.pieceWeightTon || 0, 3)
  item.piecesPerBundle = toRoundedNumber(materialRecord.piecesPerBundle || 0, 0)
  item.unitPrice = toRoundedNumber(materialRecord.unitPrice || 0, 2)
  recalculateLineItem(item, 'quantity')
}

function handleEditorItemMaterialSelect(item: ModuleLineItem, value: string | number | undefined) {
  handleEditorItemMaterialChange(item, String(value || ''))
}

function handleEditorItemInputChange(item: ModuleLineItem, key: string, event: Event) {
  handleEditorItemTextChange(item, key, (event.target as HTMLInputElement)?.value || '')
}

function filterMaterialOption(input: string, option: { label?: unknown } | undefined) {
  return String(option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function isNumberEditorColumn(columnKey: string) {
  return [
    'pieceWeightTon',
    'piecesPerBundle',
    'quantity',
    'weightTon',
    'unitPrice',
    'amount',
  ].includes(columnKey)
}

function getEditorItemPrecision(columnKey: string) {
  if (['pieceWeightTon', 'weightTon'].includes(columnKey)) {
    return 3
  }
  if (['unitPrice', 'amount'].includes(columnKey)) {
    return 2
  }
  return 0
}

function getEditorItemMin(columnKey: string) {
  if (isNumberEditorColumn(columnKey)) {
    return 0
  }
  return undefined
}

function normalizeDraftRecord() {
  const items = cloneLineItems(editorForm.items)
  const record: ModuleRecord = {
    ...(cloneRecord(editorForm) as ModuleRecord),
    id: editorMode.value === 'edit'
      ? String(editorSourceRecordId.value || editorForm.id || '')
      : String(editorForm.id || ''),
    items,
  }

  if (config.value.primaryNoKey && !record[config.value.primaryNoKey]) {
    record[config.value.primaryNoKey] = generatePrimaryNo()
  }

  if (props.moduleKey === 'carriers') {
    record.priceMode = '按吨'
  }

  if (props.moduleKey === 'purchase-orders') {
    record.buyerName = getCurrentOperatorName()
  }

  if (
    props.moduleKey === 'purchase-orders'
    || props.moduleKey === 'purchase-inbounds'
    || props.moduleKey === 'sales-orders'
    || props.moduleKey === 'sales-outbounds'
    || props.moduleKey === 'purchase-contracts'
    || props.moduleKey === 'sales-contracts'
  ) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalAmount = Number(sumLineItemsBy(items, 'amount').toFixed(2))
  }

  if (props.moduleKey === 'freight-bills') {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
    record.totalFreight = Number((Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(2))
    if (!record.deliveryStatus) {
      record.deliveryStatus = '未送达'
    }
  }

  if (props.moduleKey === 'freight-statements' && items.length) {
    record.totalWeight = Number(sumLineItemsBy(items, 'weightTon').toFixed(3))
  }

  if (props.moduleKey === 'supplier-statements') {
    record.closingAmount = Number((Number(record.purchaseAmount || 0) - Number(record.paymentAmount || 0)).toFixed(2))
  }

  if (props.moduleKey === 'customer-statements') {
    record.closingAmount = Number((Number(record.salesAmount || 0) - Number(record.receiptAmount || 0)).toFixed(2))
  }

  if (props.moduleKey === 'freight-statements') {
    record.unpaidAmount = Number((Number(record.totalFreight || 0) - Number(record.paidAmount || 0)).toFixed(2))
    if (Array.isArray(record.attachments)) {
      record.attachment = record.attachments
        .map((item) => String((item as Record<string, unknown>).name || ''))
        .filter(Boolean)
        .join(', ')
    }
  }

  if (props.moduleKey === 'role-settings') {
    const permissionCodes = Array.isArray(record.permissionCodes)
      ? record.permissionCodes.map((item) => String(item))
      : []
    const permissionLabels = permissionCodes.map((code) => permissionLabelMap[code] || code)
    record.permissionCodes = permissionCodes
    record.permissionCount = permissionCodes.length
    record.permissionSummary = permissionLabels.join('、')
  }

  if (props.moduleKey === 'user-accounts') {
    const roleNames = Array.isArray(record.roleNames)
      ? record.roleNames.map((item) => String(item))
      : []
    const permissionCodes = Array.from(
      new Set(
        roleNames.flatMap((roleName) => rolePermissionCodeMap[roleName] || []),
      ),
    )
    const permissionLabels = permissionCodes.map((code) => permissionLabelMap[code] || code)
    record.roleNames = roleNames
    record.permissionSummary = permissionLabels.join('、')
  }

  if (
    (props.moduleKey === 'purchase-orders'
      || props.moduleKey === 'purchase-inbounds'
      || props.moduleKey === 'sales-orders'
      || props.moduleKey === 'sales-outbounds')
    && !record.status
  ) {
    record.status = '草稿'
  }

  if (props.moduleKey === 'freight-bills' && !record.status) {
    record.status = '未审核'
  }

  if (props.moduleKey === 'receipts' && !record.status) {
    record.status = '草稿'
  }

  if (props.moduleKey === 'payments' && !record.status) {
    record.status = '草稿'
  }

  if ((props.moduleKey === 'receipts' || props.moduleKey === 'payments') && !record.operatorName) {
    record.operatorName = getCurrentOperatorName()
  }

  return record
}

async function handleSaveEditor(audit = false) {
  if (!validateEditorForm()) {
    return
  }

  editorSaving.value = true
  try {
    const payload = normalizeDraftRecord()
    if (audit && editorAuditTarget.value) {
      payload[editorAuditTarget.value.key] = editorAuditTarget.value.value
    }
    const response = await saveBusinessModule(props.moduleKey, payload)
    if (response.code !== 200) {
      throw new Error(response.message || '保存失败')
    }

    pagination.currentPage = 1
    await refreshModuleQueries()
    message.success(response.message || (audit ? '保存并审核成功' : '保存成功'))
    closeEditor()
  } catch (error) {
    message.error(error instanceof Error ? error.message : audit ? '保存并审核失败' : '保存失败')
  } finally {
    editorSaving.value = false
  }
}

function getEditorDateValue(key: string) {
  const value = editorForm[key]
  return value ? dayjs(String(value)) : undefined
}

function handleEditorDateChange(key: string, value: Dayjs | null) {
  editorForm[key] = value ? value.format('YYYY-MM-DD') : ''
}

function isEditorFieldDisabled(field: ModuleFormFieldDefinition) {
  if (field.disabled) {
    return true
  }

  if (props.moduleKey === 'sales-orders' && salesOrderLineLocked.value) {
    return !['orderDate', 'remark'].includes(field.key)
  }

  return false
}

function isEditorItemColumnEditable(columnKey: string) {
  if (!canEditLineItems.value) {
    return false
  }

  if (props.moduleKey === 'sales-orders' && salesOrderLineLocked.value) {
    return ['unitPrice', 'amount'].includes(columnKey)
  }

  return true
}
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="module-panel-card">
      <div class="table-page-search-wrapper">
        <a-form layout="inline" @submit.prevent="handleSearch">
          <a-row :gutter="24">
            <a-col
              v-for="filter in visibleFilters"
              :key="filter.key"
              :md="8"
              :sm="24"
            >
              <a-form-item :label="filter.label">
                <a-input
                  v-if="filter.type === 'input'"
                  v-model:value="filters[filter.key]"
                  :placeholder="filter.placeholder"
                  allow-clear
                  @press-enter="handleSearch"
                />
                <a-select
                  v-else-if="filter.type === 'select'"
                  v-model:value="filters[filter.key]"
                  allow-clear
                  :placeholder="filter.placeholder || `请选择${filter.label}`"
                >
                  <a-select-option
                    v-for="option in filter.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
                <a-range-picker
                  v-else
                  v-model:value="filters[filter.key]"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  :placeholder="['开始时间', '结束时间']"
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

      <div class="module-table-shell">
        <div class="module-table-head">
          <div class="module-table-head-title">{{ config.title }}</div>
          <div class="module-table-head-actions">
            <template v-for="action in config.actions || []" :key="action.label">
              <a-dropdown
                v-if="action.label === '导出'"
                :menu="{ items: exportMenuItems, onClick: handleExportMenuClick }"
                trigger="click"
              >
                <a-button :loading="exportLoading">{{ action.label }}</a-button>
              </a-dropdown>
              <a-button
                v-else
                :type="action.type"
                :danger="action.danger"
                @click="handleAction(action.label)"
              >
                {{ action.label }}
              </a-button>
            </template>
            <a-popover trigger="click" placement="bottomRight" overlay-class-name="column-setting-popover">
              <template #content>
                <div class="column-setting-panel">
                  <div class="column-setting-header">
                    <span>列设置</span>
                    <a @click.prevent="resetColumnSettings">恢复默认</a>
                  </div>
                  <div class="column-setting-list">
                    <div
                      v-for="item in columnSettingItems"
                      :key="item.key"
                      :class="['column-setting-item', getColumnSettingItemClass(item.key)]"
                      @dragover="handleColumnSettingDragOver(item.key, $event)"
                      @drop="handleColumnSettingDrop(item.key)"
                    >
                      <span
                        class="column-setting-drag-handle"
                        draggable="true"
                        title="拖拽排序"
                        @dragstart="handleColumnSettingDragStart(item.key, $event)"
                        @dragend="resetListColumnSettingDragState"
                      >
                        <MenuOutlined />
                      </span>
                      <a-checkbox
                        :checked="item.visible"
                        @change="handleColumnVisibleChange(item.key, $event.target.checked)"
                      >
                        {{ item.title }}
                      </a-checkbox>
                    </div>
                  </div>
                </div>
              </template>
              <a-button>列设置</a-button>
            </a-popover>
          </div>
          <div class="module-table-head-summary">{{ masterTableSummary }}</div>
        </div>
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
              <div class="table-action-group">
                <a @click.prevent="handleView(record)">查看</a>
                <a-divider type="vertical" />
                <a @click.prevent="handleEdit(record)">编辑</a>
                <a-divider type="vertical" />
                <a-popconfirm title="确定删除吗?" @confirm="handleDelete(record)">
                  <a>删除</a>
                </a-popconfirm>
                <a-divider type="vertical" />
                <a class="table-attachment-link" @click.prevent="handleAttachment(record)">
                  <PaperClipOutlined />
                  <span>附件</span>
                </a>
              </div>
            </template>
            <template v-else-if="columnMetaMap[column.key]?.type === 'status'">
              <a-tag :color="getStatusMeta(record[column.dataIndex]).color">
                {{ getStatusMeta(record[column.dataIndex]).text }}
              </a-tag>
            </template>
            <template v-else>
              {{ formatCellValue(columnMetaMap[column.key], record[column.dataIndex]) }}
            </template>
          </template>

          <template v-if="config.itemColumns?.length" #expandedRowRender="{ record }">
            <a-table
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
                <template v-if="config.itemColumns?.find((item) => item.dataIndex === column.key)?.type === 'status'">
                  <a-tag :color="getStatusMeta(itemRecord[column.dataIndex]).color">
                    {{ getStatusMeta(itemRecord[column.dataIndex]).text }}
                  </a-tag>
                </template>
                <template v-else>
                  {{
                    formatCellValue(
                      config.itemColumns?.find((item) => item.dataIndex === column.key),
                      itemRecord[column.dataIndex],
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
            <a-popover trigger="click" placement="bottomRight" overlay-class-name="column-setting-popover">
              <template #content>
                <div class="column-setting-panel">
                  <div class="column-setting-header">
                    <span>表单字段设置</span>
                    <a @click.prevent="resetFormFieldSettings">恢复默认</a>
                  </div>
                  <div class="column-setting-list">
                    <div
                      v-for="item in formFieldSettingItems"
                      :key="item.key"
                      :class="['column-setting-item', getFormFieldSettingItemClass(item.key)]"
                      @dragover="handleFormFieldSettingDragOver(item.key, $event)"
                      @drop="handleFormFieldSettingDrop(item.key)"
                    >
                      <span
                        class="column-setting-drag-handle"
                        draggable="true"
                        title="拖拽排序"
                        @dragstart="handleFormFieldSettingDragStart(item.key, $event)"
                        @dragend="resetFormFieldSettingDragState"
                      >
                        <MenuOutlined />
                      </span>
                      <a-checkbox
                        :checked="item.visible"
                        @change="handleFormFieldVisibleChange(item.key, $event.target.checked)"
                      >
                        {{ item.title }}
                      </a-checkbox>
                    </div>
                  </div>
                </div>
              </template>
              <a-button class="overlay-action-button">表单字段设置</a-button>
            </a-popover>
            <template v-if="!config.itemColumns?.length">
              <a-button class="overlay-action-button" @click="closeEditor">取消</a-button>
              <a-button type="primary" class="overlay-action-button" :loading="editorSaving" @click="handleSaveEditor">保存</a-button>
              <a-button
                v-if="canAuditEditor"
                type="primary"
                class="overlay-action-button"
                :loading="editorSaving"
                @click="handleSaveEditor(true)"
              >
                保存并审核
              </a-button>
            </template>
          </div>
        </div>
        <a-form layout="vertical" class="editor-form-shell">
          <a-row :gutter="16">
            <a-col
              v-for="field in visibleFormFields"
              :key="field.key"
              :xs="24"
              :sm="12"
              :lg="field.type === 'textarea' ? 24 : 6"
            >
              <a-form-item :label="field.label" :required="field.required">
                <a-input
                  v-if="field.type === 'input'"
                  v-model:value="editorForm[field.key]"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                />
                <a-select
                  v-else-if="field.type === 'select'"
                  v-model:value="editorForm[field.key]"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请选择${field.label}`"
                >
                  <a-select-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
                <a-select
                  v-else-if="field.type === 'multiSelect'"
                  v-model:value="editorForm[field.key]"
                  mode="multiple"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请选择${field.label}`"
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
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  :disabled="isEditorFieldDisabled(field)"
                  :value="getEditorDateValue(field.key)"
                  @change="handleEditorDateChange(field.key, $event)"
                />
                <a-input-number
                  v-else-if="field.type === 'number'"
                  v-model:value="editorForm[field.key]"
                  style="width: 100%"
                  :disabled="isEditorFieldDisabled(field)"
                  :min="field.min"
                  :precision="field.precision"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                />
                <a-textarea
                  v-else
                  v-model:value="editorForm[field.key]"
                  :rows="3"
                  :disabled="isEditorFieldDisabled(field)"
                  :placeholder="field.placeholder || `请输入${field.label}`"
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
                v-if="canManageEditorItems"
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
              <a-popover
                v-if="canEditItemColumns"
                trigger="click"
                placement="bottomRight"
                overlay-class-name="column-setting-popover"
              >
                <template #content>
                  <div class="column-setting-panel">
                    <div class="column-setting-header">
                      <span>明细列设置</span>
                      <a @click.prevent="resetEditorColumnSettings">恢复默认</a>
                    </div>
                    <div class="column-setting-list">
                      <div
                        v-for="item in editorColumnSettingItems"
                        :key="item.key"
                        :class="['column-setting-item', getEditorColumnSettingItemClass(item.key)]"
                        @dragover="handleEditorColumnSettingDragOver(item.key, $event)"
                        @drop="handleEditorColumnSettingDrop(item.key)"
                      >
                        <span
                          class="column-setting-drag-handle"
                          draggable="true"
                          title="拖拽排序"
                          @dragstart="handleEditorColumnSettingDragStart(item.key, $event)"
                          @dragend="resetEditorColumnSettingDragState"
                        >
                          <MenuOutlined />
                        </span>
                        <a-checkbox
                          :checked="item.visible"
                          @change="handleEditorColumnVisibleChange(item.key, $event.target.checked)"
                        >
                          {{ item.title }}
                        </a-checkbox>
                      </div>
                    </div>
                  </div>
                </template>
                <a-button class="overlay-action-button">明细列设置</a-button>
              </a-popover>
              <a-button class="overlay-action-button" @click="closeEditor">取消</a-button>
              <a-button type="primary" class="overlay-action-button" :loading="editorSaving" @click="handleSaveEditor">保存</a-button>
              <a-button
                v-if="canAuditEditor"
                type="primary"
                class="overlay-action-button"
                :loading="editorSaving"
                @click="handleSaveEditor(true)"
              >
                保存并审核
              </a-button>
            </div>
            <div class="editor-items-summary">
              <span>明细数 {{ editorItems.length }}</span>
              <span>吨位 {{ formatWeight(editorItems.reduce((sum, item) => sum + Number(item.weightTon || 0), 0)) }}</span>
              <span v-if="props.moduleKey !== 'freight-bills'">
                金额 {{ formatAmount(editorItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)) }}
              </span>
            </div>
          </div>
          <div v-if="parentImportConfig" class="parent-import-note">
            {{ parentImportConfig.enforceUniqueRelation ? '当前单据链按上级单据唯一占用控制；重复导入同单号会更新，选择不同单号会追加明细' : '重复导入同单号会更新，选择不同单号会追加明细' }}
          </div>
          <div v-if="props.moduleKey === 'sales-orders' && salesOrderLineLocked" class="parent-import-note">
            当前销售订单已存在下游销售出库，数量和商品信息已锁定，仅允许调整单价、金额、日期和备注。
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
                <a-select
                  :value="record.materialCode"
                  show-search
                  allow-clear
                  class="editor-item-field"
                  placeholder="选择商品编码"
                  :filter-option="filterMaterialOption"
                  @change="handleEditorItemMaterialSelect(record, $event)"
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
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key)) && isNumberEditorColumn(String(column.key))"
              >
                <a-input-number
                  :value="Number(record[column.dataIndex] || 0)"
                  class="editor-item-field"
                  style="width: 100%"
                  :min="getEditorItemMin(String(column.key))"
                  :precision="getEditorItemPrecision(String(column.key))"
                  @change="handleEditorItemNumberChange(record, String(column.key), $event)"
                />
              </template>
              <template v-else-if="isEditorItemColumnEditable(String(column.key))">
                <a-input
                  :value="String(record[column.dataIndex] || '')"
                  class="editor-item-field"
                  @change="handleEditorItemInputChange(record, String(column.key), $event)"
                />
              </template>
              <template
                v-else-if="config.itemColumns?.find((item) => item.dataIndex === column.key)?.type === 'status'"
              >
                <a-tag :color="getStatusMeta(record[column.dataIndex]).color">
                  {{ getStatusMeta(record[column.dataIndex]).text }}
                </a-tag>
              </template>
              <template v-else>
                {{
                  formatCellValue(
                    config.itemColumns?.find((item) => item.dataIndex === column.key),
                    record[column.dataIndex],
                  )
                }}
              </template>
            </template>

            <template #emptyText>
              <a-empty :description="parentImportConfig ? '当前没有明细，可手动新增或从上级单据导入' : '当前没有明细，可手动新增'" />
            </template>
          </a-table>
        </template>
        </div>
      </section>
    </div>

    <div v-if="detailVisible" class="workspace-overlay">
      <div class="workspace-overlay-mask"></div>
      <section class="workspace-overlay-panel">
        <header class="workspace-overlay-header">
          <span class="workspace-overlay-title">
            {{ activeRecord ? `${config.title}详情` : `${config.title}详情` }}
          </span>
        </header>

        <div class="workspace-overlay-body bill-detail-body">
        <a-row class="bill-detail-row" :gutter="16">
          <a-col
            v-for="field in config.detailFields"
            :key="field.key"
            :xs="24"
            :sm="12"
            :lg="8"
            class="bill-detail-col"
          >
            <div class="bill-detail-item">
              <span class="bill-detail-label">{{ field.label }}</span>
              <span class="bill-detail-value">{{ formatDetailValue(field, activeRecord) }}</span>
            </div>
          </a-col>
        </a-row>

        <template v-if="config.itemColumns">
          <div class="editor-items-head">
            <div class="editor-items-title-block">
              <h3 class="detail-section-title">明细列表</h3>
            </div>
            <div class="editor-items-actions">
              <a-button class="overlay-action-button" :loading="detailPrintLoading" @click="handlePrintDetail(true)">打印预览</a-button>
              <a-button type="primary" class="overlay-action-button" :loading="detailPrintLoading" @click="handlePrintDetail(false)">直接打印</a-button>
              <a-button class="overlay-action-button" @click="handleCloseDetail">关闭</a-button>
            </div>
            <div class="editor-items-summary">
              <span>明细数 {{ activeRecord?.items?.length || 0 }}</span>
              <span>
                吨位
                {{ formatWeight((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.weightTon || 0), 0)) }}
              </span>
              <span v-if="props.moduleKey !== 'freight-bills'">
                金额
                {{ formatAmount((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)) }}
              </span>
            </div>
          </div>
          <a-table
            v-if="activeRecord?.items?.length"
            size="small"
            bordered
            row-key="id"
            :columns="detailTableColumns"
            :data-source="activeRecord.items || []"
            :pagination="false"
            :scroll="detailTableScroll"
            class="module-detail-table"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="config.itemColumns?.find((item) => item.dataIndex === column.key)?.type === 'status'"
              >
                <a-tag :color="getStatusMeta(record[column.dataIndex]).color">
                  {{ getStatusMeta(record[column.dataIndex]).text }}
                </a-tag>
              </template>
              <template v-else>
                {{
                  formatCellValue(
                    config.itemColumns?.find((item) => item.dataIndex === column.key),
                    record[column.dataIndex],
                  )
                }}
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无明细数据" />
        </template>
        <div v-else class="editor-items-head editor-items-head-standalone">
          <div class="editor-items-title-block">
            <h3 class="detail-section-title">操作</h3>
          </div>
          <div class="editor-items-actions">
            <a-button class="overlay-action-button" :loading="detailPrintLoading" @click="handlePrintDetail(true)">打印预览</a-button>
            <a-button type="primary" class="overlay-action-button" :loading="detailPrintLoading" @click="handlePrintDetail(false)">直接打印</a-button>
            <a-button class="overlay-action-button" @click="handleCloseDetail">关闭</a-button>
          </div>
        </div>
        </div>
      </section>
    </div>

    <a-modal
      v-model:open="attachmentVisible"
      :title="attachmentRecord ? `${getPrimaryNo(attachmentRecord)} 附件` : '附件'"
      width="760px"
      :mask-closable="false"
      @cancel="closeAttachmentDialog"
    >
      <div class="parent-selector-toolbar">
        <a-input
          v-model:value="attachmentDraftName"
          allow-clear
          class="parent-selector-search"
          placeholder="输入附件名称，保存为 mock 附件"
          @press-enter="handleAddAttachment"
        />
        <a-button type="primary" :loading="attachmentSaving" @click="handleAddAttachment">
          新增附件
        </a-button>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="attachmentRows"
        :pagination="false"
        :loading="attachmentSaving"
      >
        <a-table-column key="name" title="附件名称" data-index="name" />
        <a-table-column key="uploader" title="上传人" data-index="uploader" width="120" />
        <a-table-column key="uploadTime" title="上传时间" data-index="uploadTime" width="180" />
        <a-table-column key="action" title="操作" width="100" align="center">
          <template #default="{ record }">
            <a-popconfirm title="确定删除该附件吗?" @confirm="handleRemoveAttachment(String(record.id))">
              <a>删除</a>
            </a-popconfirm>
          </template>
        </a-table-column>
        <template #emptyText>
          <a-empty description="当前没有附件，可直接新增 mock 附件" />
        </template>
      </a-table>

      <template #footer>
        <a-button @click="closeAttachmentDialog">关闭</a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="supplierStatementGeneratorVisible"
      title="生成供应商对账单"
      width="1080px"
      :mask-closable="false"
      @cancel="closeSupplierStatementGenerator"
    >
      <div class="parent-selector-toolbar">
        <span class="parent-selector-hint">
          选择采购入库单生成供应商对账单草稿；仅支持同一供应商合并，付款金额会按账期自动汇总已付款记录。
        </span>
        <span class="parent-selector-hint">
          已选 {{ supplierStatementSelectedInbounds.length }} 张
          <template v-if="supplierStatementSelectedSupplierName">
            / 供应商 {{ supplierStatementSelectedSupplierName }}
          </template>
          / 采购金额 {{ formatAmount(supplierStatementSelectedInbounds.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)) }}
        </span>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="supplierStatementCandidateRows"
        :loading="supplierStatementGeneratorLoading"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
        :row-selection="{
          selectedRowKeys: supplierStatementSelectedInboundKeys,
          onChange: handleSupplierStatementGeneratorSelection,
          getCheckboxProps: (record: ModuleRecord) => ({
            disabled: Boolean(
              supplierStatementSelectedSupplierName
              && supplierStatementSelectedSupplierName !== String(record.supplierName || ''),
            ),
          }),
        }"
      >
        <a-table-column key="inboundNo" title="采购入库单号" data-index="inboundNo" width="160" />
        <a-table-column key="supplierName" title="供应商" data-index="supplierName" width="140" />
        <a-table-column key="warehouseName" title="仓库" data-index="warehouseName" width="120" />
        <a-table-column key="inboundDate" title="入库日期" width="120">
          <template #default="{ record }">
            {{ formatCellValue({ title: '入库日期', dataIndex: 'inboundDate', type: 'date' }, record.inboundDate) }}
          </template>
        </a-table-column>
        <a-table-column key="settlementMode" title="结算方式" data-index="settlementMode" width="100" />
        <a-table-column key="totalWeight" title="总吨位" width="110" align="right">
          <template #default="{ record }">
            {{ formatWeight(record.totalWeight) }}
          </template>
        </a-table-column>
        <a-table-column key="totalAmount" title="总金额" width="110" align="right">
          <template #default="{ record }">
            {{ formatAmount(record.totalAmount) }}
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" width="110" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusMeta(record.status).color">
              {{ getStatusMeta(record.status).text }}
            </a-tag>
          </template>
        </a-table-column>
        <template #emptyText>
          <a-empty description="当前没有可生成对账单的采购入库单" />
        </template>
      </a-table>

      <template #footer>
        <a-button @click="closeSupplierStatementGenerator">取消</a-button>
        <a-button type="primary" @click="handleGenerateSupplierStatement">生成草稿</a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="customerStatementGeneratorVisible"
      title="生成客户对账单"
      width="1080px"
      :mask-closable="false"
      @cancel="closeCustomerStatementGenerator"
    >
      <div class="parent-selector-toolbar">
        <span class="parent-selector-hint">
          选择已完成销售的销售订单生成客户对账单草稿；仅支持同一客户同一项目合并。
        </span>
        <span class="parent-selector-hint">
          已选 {{ customerStatementSelectedOrders.length }} 张
          <template v-if="customerStatementSelectedCustomerName">
            / 客户 {{ customerStatementSelectedCustomerName }}
          </template>
          <template v-if="customerStatementSelectedProjectName">
            / 项目 {{ customerStatementSelectedProjectName }}
          </template>
          / 金额 {{ formatAmount(customerStatementSelectedOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)) }}
        </span>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="customerStatementCandidateRows"
        :loading="customerStatementGeneratorLoading"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
        :row-selection="{
          selectedRowKeys: customerStatementSelectedOrderKeys,
          onChange: handleCustomerStatementGeneratorSelection,
          getCheckboxProps: (record: ModuleRecord) => ({
            disabled: Boolean(
              (
                customerStatementSelectedCustomerName
                && customerStatementSelectedCustomerName !== String(record.customerName || '')
              ) || (
                customerStatementSelectedProjectName
                && customerStatementSelectedProjectName !== String(record.projectName || '')
              ),
            ),
          }),
        }"
      >
        <a-table-column key="orderNo" title="销售订单号" data-index="orderNo" width="160" />
        <a-table-column key="customerName" title="客户" data-index="customerName" width="140" />
        <a-table-column key="projectName" title="项目" data-index="projectName" />
        <a-table-column key="orderDate" title="订单日期" width="120">
          <template #default="{ record }">
            {{ formatCellValue({ title: '订单日期', dataIndex: 'orderDate', type: 'date' }, record.orderDate) }}
          </template>
        </a-table-column>
        <a-table-column key="salesName" title="销售员" data-index="salesName" width="100" />
        <a-table-column key="totalWeight" title="总吨位" width="110" align="right">
          <template #default="{ record }">
            {{ formatWeight(record.totalWeight) }}
          </template>
        </a-table-column>
        <a-table-column key="totalAmount" title="总金额" width="110" align="right">
          <template #default="{ record }">
            {{ formatAmount(record.totalAmount) }}
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" width="110" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusMeta(record.status).color">
              {{ getStatusMeta(record.status).text }}
            </a-tag>
          </template>
        </a-table-column>
        <template #emptyText>
          <a-empty description="当前没有可生成对账单的销售订单" />
        </template>
      </a-table>

      <template #footer>
        <a-button @click="closeCustomerStatementGenerator">取消</a-button>
        <a-button type="primary" @click="handleGenerateCustomerStatement">生成草稿</a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="freightStatementGeneratorVisible"
      title="生成物流对账单"
      width="1080px"
      :mask-closable="false"
      @cancel="closeFreightStatementGenerator"
    >
      <div class="parent-selector-toolbar">
        <span class="parent-selector-hint">
          选择物流单生成对账单草稿；同一物流商可合并生成，已被占用的物流单不会重复显示。
        </span>
        <span class="parent-selector-hint">
          已选 {{ freightStatementSelectedBills.length }} 张
          <template v-if="freightStatementSelectedCarrierName">
            / 物流商 {{ freightStatementSelectedCarrierName }}
          </template>
          / 吨位 {{ formatWeight(freightStatementSelectedBills.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0)) }}
          / 运费 {{ formatAmount(freightStatementSelectedBills.reduce((sum, item) => sum + Number(item.totalFreight || 0), 0)) }}
        </span>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="freightStatementCandidateRows"
        :loading="freightStatementGeneratorLoading"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
        :row-selection="{
          selectedRowKeys: freightStatementSelectedBillKeys,
          onChange: handleFreightStatementGeneratorSelection,
          getCheckboxProps: (record: ModuleRecord) => ({
            disabled: Boolean(
              freightStatementSelectedCarrierName
              && freightStatementSelectedCarrierName !== String(record.carrierName || ''),
            ),
          }),
        }"
      >
        <a-table-column key="billNo" title="物流单号" data-index="billNo" width="150" />
        <a-table-column key="carrierName" title="物流商" data-index="carrierName" width="140" />
        <a-table-column key="customerName" title="客户" data-index="customerName" width="140" />
        <a-table-column key="projectName" title="项目" data-index="projectName" />
        <a-table-column key="billTime" title="单据日期" width="120">
          <template #default="{ record }">
            {{ formatCellValue({ title: '单据日期', dataIndex: 'billTime', type: 'date' }, record.billTime) }}
          </template>
        </a-table-column>
        <a-table-column key="totalWeight" title="总吨位" width="110" align="right">
          <template #default="{ record }">
            {{ formatWeight(record.totalWeight) }}
          </template>
        </a-table-column>
        <a-table-column key="totalFreight" title="总运费" width="110" align="right">
          <template #default="{ record }">
            {{ formatAmount(record.totalFreight) }}
          </template>
        </a-table-column>
        <a-table-column key="status" title="审核状态" width="110" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusMeta(record.status).color">
              {{ getStatusMeta(record.status).text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="deliveryStatus" title="送达状态" width="110" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusMeta(record.deliveryStatus).color">
              {{ getStatusMeta(record.deliveryStatus).text }}
            </a-tag>
          </template>
        </a-table-column>
        <template #emptyText>
          <a-empty description="当前没有可生成对账单的物流单" />
        </template>
      </a-table>

      <template #footer>
        <a-button @click="closeFreightStatementGenerator">取消</a-button>
        <a-button type="primary" @click="handleGenerateFreightStatement">生成草稿</a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="freightSummaryVisible"
      title="运费对账汇总"
      width="860px"
      :mask-closable="false"
      @cancel="freightSummaryVisible = false"
    >
      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="freightSummaryRows"
        :pagination="false"
        :loading="freightSummaryLoading"
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
        <template #emptyText>
          <a-empty description="暂无汇总数据" />
        </template>
      </a-table>

      <template #footer>
        <a-button @click="freightSummaryVisible = false">关闭</a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="parentSelectorVisible"
      :title="parentImportConfig?.label ? `选择${parentImportConfig.label}` : '选择上级单据'"
      width="960px"
      :mask-closable="false"
      @cancel="closeParentSelector"
    >
      <div class="parent-selector-toolbar">
        <a-input
          v-model:value="parentSelectorKeyword"
          allow-clear
          class="parent-selector-search"
          placeholder="输入单号、客户、供应商、项目搜索"
        />
        <span class="parent-selector-hint">双击行可直接导入</span>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :data-source="parentSelectorRows"
        :loading="parentListQuery.isFetching.value"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
        :row-selection="{
          type: 'radio',
          selectedRowKeys: selectedParentId ? [selectedParentId] : [],
          onChange: (keys: Array<string | number>) => {
            selectedParentId = keys[0] ? String(keys[0]) : undefined
          },
        }"
        :custom-row="getParentSelectorRowProps"
      >
        <a-table-column key="parentNo" title="单据编号" width="180">
          <template #default="{ record }">
            {{ getParentRelationNo(record) }}
          </template>
        </a-table-column>
        <a-table-column key="summary" title="摘要">
          <template #default="{ record }">
            {{ getParentOptionLabel(record) }}
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" width="120" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusMeta(record.status).color">
              {{ getStatusMeta(record.status).text }}
            </a-tag>
          </template>
        </a-table-column>
      </a-table>

      <template #footer>
        <a-button @click="closeParentSelector">取消</a-button>
        <a-button type="primary" @click="handleImportParentItems()">导入明细</a-button>
      </template>
    </a-modal>
  </div>
</template>
