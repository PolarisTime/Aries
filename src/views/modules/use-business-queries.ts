import { computed, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import {
  listAllBusinessModuleRows,
  listBusinessModule,
  listPurchaseOrderImportCandidates,
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
  canEditLineItems: Ref<boolean>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  supportsInvoiceAssist: Ref<boolean>
  parentImportConfig: Ref<{
    parentModuleKey?: string
    enforceUniqueRelation?: boolean
    candidateQueryType?: 'purchase-order-import'
    candidateUsage?: 'purchase-inbound' | 'sales-order'
  } | undefined>
  canViewModuleRecords: (moduleKey: string | null | undefined) => boolean
  materialSelectorKeyword: Ref<string>
  materialSelectorCurrentPage: Ref<number>
  materialSelectorPageSize: Ref<number>
  parentSelectorKeyword: Ref<string>
  parentSelectorCurrentPage: Ref<number>
  parentSelectorPageSize: Ref<number>
}

interface ParentQueryPageResult {
  rows: ModuleRecord[]
  total: number
}

function isParentQueryPageResult(value: unknown): value is ParentQueryPageResult {
  return Boolean(
    value
    && typeof value === 'object'
    && Array.isArray((value as ParentQueryPageResult).rows),
  )
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
    editorVisible,
    editorForm,
    supportsInvoiceAssist,
    parentImportConfig,
    canViewModuleRecords,
    materialSelectorKeyword,
    materialSelectorCurrentPage,
    materialSelectorPageSize,
    parentSelectorKeyword,
    parentSelectorCurrentPage,
    parentSelectorPageSize,
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

  const parentListQuery = useQuery({
    queryKey: computed(() => [
      'business-parent-search',
      moduleKey.value,
      parentImportConfig.value?.parentModuleKey || '',
      parentImportConfig.value?.candidateQueryType || '',
      parentImportConfig.value?.candidateUsage || '',
      parentSelectorKeyword.value.trim(),
      parentSelectorCurrentPage.value,
      parentSelectorPageSize.value,
    ]),
    queryFn: async () => {
      const parentModuleKey = String(parentImportConfig.value?.parentModuleKey || '')
      const keyword = parentSelectorKeyword.value.trim()
      if (parentImportConfig.value?.candidateQueryType === 'purchase-order-import' && parentImportConfig.value?.candidateUsage) {
        return listPurchaseOrderImportCandidates(
          parentImportConfig.value.candidateUsage,
          keyword,
          {
            currentPage: parentSelectorCurrentPage.value,
            pageSize: parentSelectorPageSize.value,
          },
        )
      }

      return searchBusinessModule(parentModuleKey, keyword, 200)
    },
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
    queryKey: computed(() => [
      'business-grid',
      'materials',
      'selector',
      materialSelectorKeyword.value.trim(),
      materialSelectorCurrentPage.value,
      materialSelectorPageSize.value,
    ]),
    queryFn: () =>
      listBusinessModule(
        'materials',
        { keyword: materialSelectorKeyword.value.trim() },
        {
          currentPage: materialSelectorCurrentPage.value,
          pageSize: materialSelectorPageSize.value,
        },
      ),
    enabled: computed(() =>
      editorVisible.value
      && canViewModuleRecords('materials'),
    ),
    placeholderData: keepPreviousData,
  })

  const materialOptionRowsQuery = useQuery({
    queryKey: ['business-grid-search', 'materials', 'editor-options'],
    queryFn: () => searchBusinessModule('materials', '', 200),
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
  const parentRows = computed(() => {
    const result = parentListQuery.data.value
    return isParentQueryPageResult(result) ? result.rows : (result || [])
  })
  const parentRowTotal = computed(() => {
    const result = parentListQuery.data.value
    return isParentQueryPageResult(result) ? result.total : parentRows.value.length
  })
  const moduleRows = computed(() => moduleRowsQuery.data.value || [])
  const materialListResult = computed(() => normalizeTableResponse(materialListQuery.data.value))
  const materialRows = computed(() => materialOptionRowsQuery.data.value || [])
  const materialSelectorRows = computed(() => materialListResult.value.rows)
  const materialRowTotal = computed(() => materialListResult.value.total)
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
    Object.fromEntries(
      [...materialRows.value, ...materialSelectorRows.value].map((record) => [String(record.materialCode ?? '').trim(), record]),
    ),
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
    parentRowTotal,
    moduleRows,
    materialRows,
    materialSelectorRows,
    materialRowTotal,
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
