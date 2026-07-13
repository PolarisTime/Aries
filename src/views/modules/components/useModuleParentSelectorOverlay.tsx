import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import i18next from 'i18next'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail, listBusinessModule } from '@/api/business'
import { buildFilterParams } from '@/api/business-listing-filtering'
import { listFreightBillImportCandidatePage } from '@/api/freight-bill-candidates'
import {
  listInvoiceIssueSourceCandidatePage,
  listInvoiceReceiptSourceCandidatePage,
} from '@/api/invoice-candidates'
import { getModuleConfig } from '@/api/module-contracts'
import {
  listPurchaseOrderImportCandidatePage,
  listPurchaseOrderPrepaymentCandidatePage,
  listPurchaseRefundSourceCandidatePage,
} from '@/api/purchase-order-candidates'
import { listSalesOrderOutboundImportCandidatePage } from '@/api/sales-order-candidates'
import { listStatementCandidatePage } from '@/api/statements'
import { StatusTag } from '@/components/StatusTag'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { QUERY_KEYS } from '@/constants/query-keys'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import {
  getDisplayStatus,
  isDeletedModuleRecord,
} from '@/module-system/module-record-deletion'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import {
  compactParentSelectorFilters,
  filterImportableParentRecords,
  mergeParentSelectorFilters,
  resolveSelectedParentRows,
  resolveVisibleParentSelectorColumns,
} from './module-parent-selector-utils'

export interface ModuleParentSelectorOverlayContentProps {
  parentModuleKey: string
  parentDisplayFieldKey?: string
  allowMultipleSelection?: boolean
  candidateStatementModuleKey?:
    | 'supplier-statement'
    | 'customer-statement'
    | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
  candidateUsage?: ModuleParentImportDefinition['candidateUsage']
  hiddenSelectorColumnKeys?: ModuleParentImportDefinition['hiddenSelectorColumnKeys']
  fixedFilters?: SearchParams
  title?: string
  onSelect: (records: ModuleRecord[]) => void
  onClose: () => void
}

type OverlayColumn = {
  dataIndex: string
  title: string
  width?: number
  type?: 'date' | 'amount' | 'weight' | 'status'
}

type SelectedSummaryField = {
  key: string
  label: string
  type?: 'date'
}

interface ParentSelectorState {
  draftFilters: SearchParams
  submittedFilters: SearchParams
  page: number
  pageSize: number
  selectedRowKeys: string[]
  selectedRecordMap: Record<string, ModuleRecord>
}

export const EMPTY_FIXED_FILTERS: SearchParams = {}
export const DEFAULT_PAGE_SIZE = 15

export type ParentSelectorTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

export type ParentSelectorFormatCellValue = (
  value: unknown,
  type?: 'date' | 'amount' | 'weight' | 'status',
) => string

const parentDisplayFieldFallbackMap: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
}

const parentSelectorInitialState: ParentSelectorState = {
  draftFilters: {},
  submittedFilters: {},
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  selectedRowKeys: [],
  selectedRecordMap: {},
}

export function getOverlayStatusMap() {
  return {
    [DOCUMENT_STATUS.DRAFT]: {
      color: 'default',
      text: i18next.t('modules.parentSelector.status.draft'),
    },
    [DOCUMENT_STATUS.PRE_OUTBOUND]: {
      color: 'warning',
      text: i18next.t('modules.parentSelector.status.preOutbound'),
    },
    [DOCUMENT_STATUS.UNAUDITED]: {
      color: 'default',
      text: i18next.t('modules.parentSelector.status.unaudited'),
    },
    [DOCUMENT_STATUS.AUDITED]: {
      color: 'processing',
      text: i18next.t('modules.parentSelector.status.audited'),
    },
    [DOCUMENT_STATUS.INVOICED_RECEIVED]: {
      color: 'success',
      text: i18next.t('modules.parentSelector.status.invoiceReceived'),
    },
    [DOCUMENT_STATUS.INVOICED_ISSUED]: {
      color: 'success',
      text: i18next.t('modules.parentSelector.status.invoiceIssued'),
    },
    [DOCUMENT_STATUS.PURCHASE_COMPLETED]: {
      color: 'success',
      text: i18next.t('modules.parentSelector.status.purchaseComplete'),
    },
    [DOCUMENT_STATUS.SALES_COMPLETED]: {
      color: 'success',
      text: i18next.t('modules.parentSelector.status.salesComplete'),
    },
    [DOCUMENT_STATUS.INBOUND_COMPLETED]: {
      color: 'success',
      text: i18next.t('modules.parentSelector.status.inboundComplete'),
    },
    已删除: {
      color: 'error',
      text: i18next.t('modules.status.deleted'),
    },
  }
}

function getParentSelectorColumnMap(): Record<string, OverlayColumn[]> {
  return {
    'purchase-order': [
      {
        dataIndex: 'orderNo',
        title: i18next.t('modules.parentSelector.column.orderNo'),
        width: 160,
      },
      {
        dataIndex: 'supplierName',
        title: i18next.t('modules.parentSelector.column.supplierName'),
        width: 180,
      },
      {
        dataIndex: 'buyerName',
        title: i18next.t('modules.parentSelector.column.buyerName'),
        width: 120,
      },
      {
        dataIndex: 'orderDate',
        title: i18next.t('modules.parentSelector.column.orderDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'sales-order': [
      {
        dataIndex: 'orderNo',
        title: i18next.t('modules.parentSelector.column.orderNo'),
        width: 160,
      },
      {
        dataIndex: 'purchaseOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedPurchaseOrder'),
        width: 180,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'deliveryDate',
        title: i18next.t('modules.parentSelector.column.deliveryDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'sales-outbound': [
      {
        dataIndex: 'outboundNo',
        title: i18next.t('modules.parentSelector.column.outboundNo'),
        width: 160,
      },
      {
        dataIndex: 'salesOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedOrder'),
        width: 160,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'outboundDate',
        title: i18next.t('modules.parentSelector.column.outboundDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'freight-bill': [
      {
        dataIndex: 'billNo',
        title: i18next.t('modules.filter.freightNo'),
        width: 160,
      },
      {
        dataIndex: 'carrierName',
        title: i18next.t('modules.filter.carrierName'),
        width: 150,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'billTime',
        title: i18next.t('modules.parentSelector.summary.billTime'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalFreight',
        title: i18next.t('modules.pages.freightStatement.totalFreight'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'purchase-inbound': [
      {
        dataIndex: 'inboundNo',
        title: i18next.t('modules.parentSelector.column.inboundNo'),
        width: 160,
      },
      {
        dataIndex: 'purchaseOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedOrder'),
        width: 160,
      },
      {
        dataIndex: 'supplierName',
        title: i18next.t('modules.parentSelector.column.supplierName'),
        width: 180,
      },
      {
        dataIndex: 'inboundDate',
        title: i18next.t('modules.parentSelector.column.inboundDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
  }
}

function resolveParentSelectorColumns(
  parentModuleKey: string,
  displayFieldKey: string,
): OverlayColumn[] {
  const configuredColumns = getParentSelectorColumnMap()[parentModuleKey]
  if (configuredColumns?.length) {
    return configuredColumns
  }
  return [
    {
      dataIndex: displayFieldKey,
      title: i18next.t('modules.parentSelector.column.docNo'),
      width: 180,
    },
    {
      dataIndex: 'status',
      title: i18next.t('modules.parentSelector.column.status'),
      width: 110,
      type: 'status',
    },
  ]
}

function needsParentDetail(record: ModuleRecord) {
  return !Array.isArray(record.items) || record.items.length === 0
}

async function resolveParentImportRecords(
  parentModuleKey: string,
  records: ModuleRecord[],
  candidateStatementModuleKey?: string,
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  if (candidateStatementModuleKey || candidateQueryType) {
    return records
  }
  const resolvedRecords = await Promise.all(
    records.map(async (record) => {
      if (!record.id || !needsParentDetail(record)) {
        return record
      }
      const detail = await getBusinessModuleDetail(
        parentModuleKey,
        String(record.id),
      )
      return detail.data
    }),
  )
  return resolvedRecords
}

function resolveParentSelectorSourceModule(
  parentModuleKey: string,
  candidateStatementModuleKey?: string,
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  if (candidateQueryType === 'purchase-order-import') {
    return 'purchase-order-import'
  }
  if (candidateQueryType === 'purchase-prepayment') {
    return 'purchase-prepayment'
  }
  if (candidateQueryType === 'purchase-refund-source') {
    return 'purchase-refund-source'
  }
  if (candidateQueryType === 'freight-bill-import') {
    return 'freight-bill-import'
  }
  if (candidateQueryType === 'sales-order-outbound-import') {
    return 'sales-order-outbound-import'
  }
  if (candidateQueryType === 'invoice-issue-source') {
    return 'invoice-issue-source'
  }
  if (candidateQueryType === 'invoice-receipt-source') {
    return 'invoice-receipt-source'
  }
  return candidateStatementModuleKey || parentModuleKey
}

function buildOverlayFilterConfig(
  parentModuleKey: string,
  pageConfig: ModulePageConfig,
  fixedFilters: SearchParams,
): ModulePageConfig {
  const endpointConfig = getModuleConfig(parentModuleKey)
  const nativeFilterKeys = new Set(endpointConfig.nativeFilterKeys || [])
  const dateRangeKeys = new Set(
    Object.keys(endpointConfig.dateRangeMapping || {}),
  )
  const fixedFilterKeys = new Set(
    Object.keys(compactParentSelectorFilters(fixedFilters)),
  )

  const supportedFilters = pageConfig.filters.filter((filter) => {
    if (fixedFilterKeys.has(filter.key)) {
      return false
    }
    if (filter.type === 'dateRange') {
      return dateRangeKeys.has(filter.key)
    }
    return nativeFilterKeys.has(filter.key)
  })

  if (!supportedFilters.some((filter) => filter.key === 'keyword')) {
    supportedFilters.unshift({
      key: 'keyword',
      label: i18next.t('modules.parentSelector.filter.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.parentSelector.filter.keywordPlaceholder',
      ),
    })
  }

  return {
    ...pageConfig,
    filters: supportedFilters,
  }
}

function getSelectedRecordSummaryFieldMap(): Record<
  string,
  SelectedSummaryField[]
> {
  return {
    'purchase-order': [
      {
        key: 'supplierName',
        label: i18next.t('modules.parentSelector.summary.supplierName'),
      },
      {
        key: 'buyerName',
        label: i18next.t('modules.parentSelector.summary.buyerName'),
      },
      {
        key: 'orderDate',
        label: i18next.t('modules.parentSelector.summary.orderDate'),
        type: 'date',
      },
    ],
    'purchase-inbound': [
      {
        key: 'supplierName',
        label: i18next.t('modules.parentSelector.summary.supplierName'),
      },
      {
        key: 'purchaseOrderNo',
        label: i18next.t('modules.parentSelector.summary.relatedOrder'),
      },
      {
        key: 'inboundDate',
        label: i18next.t('modules.parentSelector.summary.inboundDate'),
        type: 'date',
      },
    ],
    'sales-order': [
      {
        key: 'customerName',
        label: i18next.t('modules.parentSelector.summary.customerName'),
      },
      {
        key: 'projectName',
        label: i18next.t('modules.parentSelector.summary.projectName'),
      },
      {
        key: 'deliveryDate',
        label: i18next.t('modules.parentSelector.summary.deliveryDate'),
        type: 'date',
      },
    ],
    'sales-outbound': [
      {
        key: 'customerName',
        label: i18next.t('modules.parentSelector.summary.customerName'),
      },
      {
        key: 'projectName',
        label: i18next.t('modules.parentSelector.summary.projectName'),
      },
      {
        key: 'outboundDate',
        label: i18next.t('modules.parentSelector.summary.outboundDate'),
        type: 'date',
      },
    ],
    'freight-bill': [
      {
        key: 'carrierName',
        label: i18next.t('modules.parentSelector.summary.carrierName'),
      },
      {
        key: 'outboundNo',
        label: i18next.t('modules.parentSelector.summary.relatedOutbound'),
      },
      {
        key: 'billTime',
        label: i18next.t('modules.parentSelector.summary.billTime'),
        type: 'date',
      },
    ],
  }
}

export function buildSelectedRecordSummary(
  record: ModuleRecord,
  parentModuleKey: string,
  displayFieldKey: string,
  formatValue: ParentSelectorFormatCellValue,
) {
  const primary = asString(record[displayFieldKey] || record.id)
  const meta = (
    getSelectedRecordSummaryFieldMap()[parentModuleKey] || []
  ).flatMap((field) => {
    const rawValue =
      field.type != null
        ? formatValue(record[field.key], field.type)
        : asString(record[field.key]).trim()
    const value = String(rawValue || '').trim()
    return value ? [`${field.label}：${value}`] : []
  })

  return {
    primary,
    meta,
    status: getDisplayStatus(record).trim(),
  }
}

export function useModuleParentSelectorOverlay({
  parentModuleKey,
  parentDisplayFieldKey,
  allowMultipleSelection = false,
  candidateStatementModuleKey,
  candidateQueryType,
  candidateUsage,
  hiddenSelectorColumnKeys,
  fixedFilters = EMPTY_FIXED_FILTERS,
  title,
  onSelect,
  onClose,
}: ModuleParentSelectorOverlayContentProps) {
  const { t } = useTranslation()
  const effectiveTitle = title ?? t('modules.parentSelector.title')
  const { formatCellValue } = useModuleDisplaySupport()
  const [state, setState] = useReducer(
    (prev: ParentSelectorState, patch: Partial<ParentSelectorState>) => ({
      ...prev,
      ...patch,
    }),
    parentSelectorInitialState,
  )
  const {
    draftFilters,
    submittedFilters,
    page,
    pageSize,
    selectedRowKeys,
    selectedRecordMap,
  } = state
  const displayFieldKey =
    parentDisplayFieldKey ||
    parentDisplayFieldFallbackMap[parentModuleKey] ||
    'id'
  const effectiveFixedFilters = compactParentSelectorFilters(fixedFilters)
  const effectiveSubmittedFilters = mergeParentSelectorFilters(
    submittedFilters,
    effectiveFixedFilters,
  )

  const { data: parentPageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorConfig(parentModuleKey),
    queryFn: () => loadBusinessPageConfig(parentModuleKey),
    enabled: !!parentModuleKey,
    staleTime: Infinity,
  })
  const overlayFilterConfig = parentPageConfig
    ? buildOverlayFilterConfig(
        parentModuleKey,
        parentPageConfig,
        effectiveFixedFilters,
      )
    : undefined

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorList(
      resolveParentSelectorSourceModule(
        parentModuleKey,
        candidateStatementModuleKey,
        candidateQueryType,
      ),
      effectiveSubmittedFilters,
      page,
      pageSize,
    ),
    queryFn: ({ signal }) => {
      if (candidateStatementModuleKey) {
        return listStatementCandidatePage(
          candidateStatementModuleKey,
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'purchase-order-import') {
        return listPurchaseOrderImportCandidatePage(
          candidateUsage || 'purchase-inbound',
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'purchase-prepayment') {
        return listPurchaseOrderPrepaymentCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'purchase-refund-source') {
        return listPurchaseRefundSourceCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'freight-bill-import') {
        return listFreightBillImportCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'sales-order-outbound-import') {
        return listSalesOrderOutboundImportCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'invoice-issue-source') {
        return listInvoiceIssueSourceCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      if (candidateQueryType === 'invoice-receipt-source') {
        return listInvoiceReceiptSourceCandidatePage(
          buildFilterParams(parentModuleKey, effectiveSubmittedFilters),
          Math.max(page - 1, 0),
          pageSize,
        )
      }
      return listBusinessModule(
        parentModuleKey,
        effectiveSubmittedFilters,
        {
          currentPage: page,
          pageSize,
        },
        { signal },
      )
    },
    enabled: !!parentModuleKey,
    placeholderData: keepPreviousData,
  })

  const records = filterImportableParentRecords(
    parentModuleKey,
    data?.data?.rows || [],
    candidateStatementModuleKey,
    candidateQueryType,
  )
  const total = Number(data?.data?.total || 0)
  const columns: ColumnsType<ModuleRecord> =
    resolveVisibleParentSelectorColumns(
      resolveParentSelectorColumns(parentModuleKey, displayFieldKey),
      hiddenSelectorColumnKeys,
    ).map((column) => ({
      dataIndex: column.dataIndex,
      title: column.title,
      width: column.width,
      ellipsis: true,
      render: (value: unknown, record: ModuleRecord) => {
        if (column.type === 'status') {
          const status = getDisplayStatus(record, column.dataIndex)
          return (
            <StatusTag
              status={status}
              statusMap={getOverlayStatusMap()}
              fallback={status}
            />
          )
        }
        return formatCellValue(value, column.type)
      },
    }))
  const selectedRows = resolveSelectedParentRows(
    selectedRowKeys,
    selectedRecordMap,
    records,
  )

  const toggleRecordSelection = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    const isSelected = selectedRowKeys.includes(recordKey)
    const nextSelectedRecordMap = { ...selectedRecordMap }
    if (isSelected) {
      delete nextSelectedRecordMap[recordKey]
    } else {
      nextSelectedRecordMap[recordKey] = record
    }
    setState({
      selectedRowKeys: isSelected
        ? selectedRowKeys.filter((key) => key !== recordKey)
        : [...selectedRowKeys, recordKey],
      selectedRecordMap: nextSelectedRecordMap,
    })
  }

  const updateFilter = (key: string, value: unknown) => {
    setState({
      draftFilters: {
        ...draftFilters,
        [key]: value,
      },
    })
  }

  const applyFilters = (nextFilters: SearchParams) => {
    setState({
      draftFilters: { ...nextFilters },
      submittedFilters: { ...nextFilters },
      page: 1,
    })
  }

  const resetFilters = () => {
    setState({
      draftFilters: {},
      submittedFilters: {},
      page: 1,
    })
  }

  const removeSelectedRecord = (recordId: string) => {
    if (!selectedRecordMap[recordId]) {
      setState({
        selectedRowKeys: selectedRowKeys.filter((key) => key !== recordId),
      })
      return
    }
    const nextSelectedRecordMap = { ...selectedRecordMap }
    delete nextSelectedRecordMap[recordId]
    setState({
      selectedRowKeys: selectedRowKeys.filter((key) => key !== recordId),
      selectedRecordMap: nextSelectedRecordMap,
    })
  }

  const handleClearSelectedRecords = () => {
    setState({ selectedRowKeys: [], selectedRecordMap: {} })
  }

  const handleSelectedRowsChange = (
    keys: React.Key[],
    rows: ModuleRecord[],
  ) => {
    const normalizedKeys = keys.map((key) => String(key))
    setState({
      selectedRowKeys: normalizedKeys,
      selectedRecordMap: Object.fromEntries(
        normalizedKeys.map((normalizedKey) => {
          const matchedRow = rows.find(
            (row) => String(row.id) === normalizedKey,
          )
          return [normalizedKey, matchedRow || selectedRecordMap[normalizedKey]]
        }),
      ),
    })
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setState({
      page: nextPage,
      pageSize: nextPageSize !== pageSize ? nextPageSize : pageSize,
    })
  }

  const handleImportRecords = async (recordsToImport: ModuleRecord[]) => {
    try {
      const resolvedRecords = await resolveParentImportRecords(
        parentModuleKey,
        recordsToImport,
        candidateStatementModuleKey,
        candidateQueryType,
      )
      if (resolvedRecords.some(isDeletedModuleRecord)) {
        message.error(t('modules.importParentFailed'))
        return
      }
      onSelect(resolvedRecords)
      onClose()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.importParentFailed'),
      )
    }
  }

  return {
    allowMultipleSelection,
    applyFilters,
    columns,
    displayFieldKey,
    draftFilters,
    effectiveTitle,
    formatCellValue,
    handleClearSelectedRecords,
    handleImportRecords,
    handlePageChange,
    handleSelectedRowsChange,
    isLoading: isLoading || isFetching || isConfigLoading,
    onClose,
    overlayFilterConfig,
    page,
    pageSize,
    parentModuleKey,
    records,
    removeSelectedRecord,
    resetFilters,
    selectedRows,
    selectedRowKeys,
    submittedFilters,
    t,
    toggleRecordSelection,
    total,
    updateFilter,
  }
}
