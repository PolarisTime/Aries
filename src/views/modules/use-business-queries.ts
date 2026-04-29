import { computed, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import {
  getPageUploadRule,
  listAllBusinessModuleRows,
  listBusinessModule,
  searchBusinessModule,
} from '@/api/business'
import { normalizeTableResponse } from '@/utils/list'
import type { ModuleRecord } from '@/types/module-page'
import { getBehaviorValue, hasBehavior } from './module-behavior-registry'
import { parseParentRelationNos } from './module-adapter-shared'

interface UseBusinessQueriesOptions {
  moduleKey: Ref<string>
  submittedFilters: Ref<Record<string, unknown>>
  paginationCurrentPage: Ref<number>
  paginationPageSize: Ref<number>
  canViewRecords: Ref<boolean>
  isReadOnly: Ref<boolean>
  canEditLineItems: Ref<boolean>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  supportsInvoiceAssist: Ref<boolean>
  parentImportConfig: Ref<{ parentModuleKey?: string; enforceUniqueRelation?: boolean } | undefined>
  canViewModuleRecords: (moduleKey: string | null | undefined) => boolean
  materialSelectorKeyword: Ref<string>
}

export function findRowsByRelation(
  rows: ModuleRecord[],
  sourceField: string,
  targetValue: string,
) {
  const normalizedTarget = targetValue.trim()
  if (!sourceField || !normalizedTarget) {
    return []
  }

  return rows.filter((record) =>
    parseParentRelationNos(record[sourceField]).includes(normalizedTarget),
  )
}

export function useBusinessQueries(options: UseBusinessQueriesOptions) {
  const {
    moduleKey,
    submittedFilters,
    paginationCurrentPage,
    paginationPageSize,
    canViewRecords,
    isReadOnly,
    editorVisible,
    editorForm,
    supportsInvoiceAssist,
    parentImportConfig,
    canViewModuleRecords,
    materialSelectorKeyword,
  } = options

  const listQuery = useQuery({
    queryKey: computed(() => [
      'business-grid',
      moduleKey.value,
      submittedFilters.value,
      paginationCurrentPage.value,
      paginationPageSize.value,
    ]),
    queryFn: () =>
      listBusinessModule(moduleKey.value, submittedFilters.value, {
        currentPage: paginationCurrentPage.value,
        pageSize: paginationPageSize.value,
      }),
    enabled: canViewRecords,
    placeholderData: keepPreviousData,
  })

  const uploadRuleDetailQuery = useQuery({
    queryKey: computed(() => ['page-upload-rule', moduleKey.value]),
    queryFn: async () => {
      try {
        return await getPageUploadRule(moduleKey.value)
      } catch {
        return null
      }
    },
    enabled: computed(() => Boolean(moduleKey.value) && !isReadOnly.value),
    placeholderData: keepPreviousData,
  })

  const parentListQuery = useQuery({
    queryKey: computed(() => [
      'business-parent-search',
      moduleKey.value,
      parentImportConfig.value?.parentModuleKey || '',
    ]),
    queryFn: () =>
      searchBusinessModule(String(parentImportConfig.value?.parentModuleKey || ''), '', 200),
    enabled: computed(() =>
      editorVisible.value
      && Boolean(parentImportConfig.value?.parentModuleKey)
      && canViewModuleRecords(parentImportConfig.value?.parentModuleKey),
    ),
    placeholderData: keepPreviousData,
  })

  const moduleRowsQuery = useQuery({
    queryKey: computed(() => [
      'business-grid-all',
      moduleKey.value,
    ]),
    queryFn: () => listAllBusinessModuleRows(moduleKey.value, {}),
    enabled: computed(() =>
      editorVisible.value
      && Boolean(parentImportConfig.value?.enforceUniqueRelation)
      && canViewRecords.value,
    ),
    placeholderData: keepPreviousData,
  })

  const materialListQuery = useQuery({
    queryKey: ['business-grid-all', 'materials'],
    queryFn: () => listAllBusinessModuleRows('materials', {}),
    enabled: computed(() =>
      editorVisible.value
      && canViewModuleRecords('materials'),
    ),
    placeholderData: keepPreviousData,
  })

  const warehouseListQuery = useQuery({
    queryKey: ['business-grid-all', 'warehouses'],
    queryFn: () => listAllBusinessModuleRows('warehouses', {}),
    enabled: computed(() =>
      editorVisible.value
      && canViewModuleRecords('warehouses'),
    ),
    placeholderData: keepPreviousData,
  })

  const departmentListQuery = useQuery({
    queryKey: ['business-grid-all', 'departments'],
    queryFn: () => listAllBusinessModuleRows('departments', {}),
    enabled: computed(() =>
      editorVisible.value
      && moduleKey.value === 'departments'
      && canViewModuleRecords('departments'),
    ),
    placeholderData: keepPreviousData,
  })

  const companySettingRowsQuery = useQuery({
    queryKey: ['business-grid-all', 'company-settings', 'invoice-assist'],
    queryFn: () => listAllBusinessModuleRows('company-settings', {}),
    enabled: computed(() =>
      editorVisible.value
      && supportsInvoiceAssist.value
      && canViewModuleRecords('company-settings'),
    ),
    placeholderData: keepPreviousData,
  })

  const customerStatementRowsQuery = useQuery({
    queryKey: ['business-grid-all', 'customer-statements', 'receipt-link'],
    queryFn: () => listAllBusinessModuleRows('customer-statements', {}),
    enabled: computed(() =>
      editorVisible.value
      && moduleKey.value === 'receipts'
      && canViewModuleRecords('customer-statements'),
    ),
    placeholderData: keepPreviousData,
  })

  const supplierStatementRowsQuery = useQuery({
    queryKey: ['business-grid-all', 'supplier-statements', 'payment-link'],
    queryFn: () => listAllBusinessModuleRows('supplier-statements', {}),
    enabled: computed(() =>
      editorVisible.value
      && moduleKey.value === 'payments'
      && canViewModuleRecords('supplier-statements'),
    ),
    placeholderData: keepPreviousData,
  })

  const freightStatementRowsQuery = useQuery({
    queryKey: ['business-grid-all', 'freight-statements', 'payment-link'],
    queryFn: () => listAllBusinessModuleRows('freight-statements', {}),
    enabled: computed(() =>
      editorVisible.value
      && moduleKey.value === 'payments'
      && canViewModuleRecords('freight-statements'),
    ),
    placeholderData: keepPreviousData,
  })

  const lineItemLockSourceModule = computed(() =>
    String(getBehaviorValue(moduleKey.value, 'lineItemLockSourceModule') || ''),
  )
  const lineItemLockSourceField = computed(() =>
    String(getBehaviorValue(moduleKey.value, 'lineItemLockSourceField') || ''),
  )
  const lineItemLockTargetField = computed(() =>
    String(getBehaviorValue(moduleKey.value, 'lineItemLockTargetField') || ''),
  )

  const lineItemLockSourceRowsQuery = useQuery({
    queryKey: computed(() => ['business-grid-all', lineItemLockSourceModule.value, 'editor-lock']),
    queryFn: () => listAllBusinessModuleRows(lineItemLockSourceModule.value, {}),
    enabled: computed(() =>
      editorVisible.value
      && hasBehavior(moduleKey.value, 'locksLineItemsWhenRecordLocked')
      && Boolean(lineItemLockSourceModule.value)
      && canViewModuleRecords(lineItemLockSourceModule.value),
    ),
    placeholderData: keepPreviousData,
  })

  const listResult = computed(() => normalizeTableResponse(listQuery.data.value))
  const parentRows = computed(() => parentListQuery.data.value || [])
  const moduleRows = computed(() => moduleRowsQuery.data.value || [])
  const materialRows = computed(() => materialListQuery.data.value || [])
  const filteredMaterialSelectorRows = computed(() => {
    const keyword = materialSelectorKeyword.value.trim().toLowerCase()
    if (!keyword) {
      return materialRows.value
    }
    return materialRows.value.filter((record) =>
      [
        record.materialCode,
        record.brand,
        record.material,
        record.category,
        record.spec,
        record.length,
        record.unit,
      ].some((value) => String(value || '').toLowerCase().includes(keyword)),
    )
  })
  const warehouseRows = computed(() => warehouseListQuery.data.value || [])
  const departmentRows = computed(() => departmentListQuery.data.value || [])
  const companySettingRows = computed(() => companySettingRowsQuery.data.value || [])
  const customerStatementRows = computed(() => customerStatementRowsQuery.data.value || [])
  const supplierStatementRows = computed(() => supplierStatementRowsQuery.data.value || [])
  const freightStatementRows = computed(() => freightStatementRowsQuery.data.value || [])
  const lineItemLockSourceRows = computed(() => lineItemLockSourceRowsQuery.data.value || [])
  const lineItemLockRelatedRows = computed(() => {
    const sourceField = lineItemLockSourceField.value
    const targetField = lineItemLockTargetField.value
    if (!sourceField || !targetField) {
      return []
    }

    const targetValue = String(editorForm[targetField] || '').trim()
    if (!targetValue) {
      return []
    }

    return findRowsByRelation(lineItemLockSourceRows.value, sourceField, targetValue)
  })
  const materialMap = computed<Record<string, ModuleRecord>>(() =>
    Object.fromEntries(materialRows.value.map((record) => [String(record.materialCode || ''), record])),
  )
  const currentCompanySetting = computed(() =>
    companySettingRows.value.find((record) => String(record.status || '') === '正常')
    || companySettingRows.value[0]
    || null,
  )
  const currentInvoiceTaxRate = computed(() => {
    const rate = Number(currentCompanySetting.value?.taxRate)
    return Number.isFinite(rate) ? Number(rate.toFixed(4)) : 0
  })

  return {
    listQuery,
    uploadRuleDetailQuery,
    parentListQuery,
    moduleRowsQuery,
    materialListQuery,
    warehouseListQuery,
    departmentListQuery,
    companySettingRowsQuery,
    customerStatementRowsQuery,
    supplierStatementRowsQuery,
    freightStatementRowsQuery,
    lineItemLockSourceRowsQuery,
    listResult,
    parentRows,
    moduleRows,
    materialRows,
    filteredMaterialSelectorRows,
    warehouseRows,
    departmentRows,
    companySettingRows,
    customerStatementRows,
    supplierStatementRows,
    freightStatementRows,
    lineItemLockSourceRows,
    lineItemLockRelatedRows,
    materialMap,
    currentCompanySetting,
    currentInvoiceTaxRate,
  }
}
