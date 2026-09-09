import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Spin, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import i18next from 'i18next'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { buildFilterParamsFromContract } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import {
  getParentCandidateFilterContract,
  type ParentCandidateFilterContract,
} from '@/api/contracts/parent-candidate-contracts'
import { listStatementCandidatePage } from '@/api/finance/statements'
import { listFreightSalesOrderCandidatePage } from '@/api/logistics/freight-bill-candidates'
import { listPurchaseOrderInboundImportCandidatePage } from '@/api/purchase/purchase-order-candidates'
import {
  listSalesOrderOutboundImportCandidatePage,
  listSalesOrderPurchaseSourceCandidatePage,
} from '@/api/sales/sales-order-candidates'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
import { StatusTag } from '@/components/StatusTag'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import {
  DETAIL_TOGGLE_COLUMN_ID,
  DETAIL_TOGGLE_COLUMN_WIDTH,
} from '@/hooks/useGridColumns'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { usePatchState } from '@/hooks/usePatchState'
import {
  getDisplayStatus,
  isDeletedModuleRecord,
} from '@/module-system/record/module-record-deletion'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { ModuleRecordDetailInline } from './ModuleRecordDetailInline'
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
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
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

type ParentSelectorInlineDetailItem = {
  record: ModuleRecord | null
  loading: boolean
  error: unknown
}

interface ParentSelectorState {
  draftFilters: SearchParams
  submittedFilters: SearchParams
  page: number
  pageSize: number
  selectedRowKeys: string[]
  selectedRecordMap: Record<string, ModuleRecord>
  detailExpandedRowKeys: string[]
  inlineDetailItems: Record<string, ParentSelectorInlineDetailItem>
}

export const EMPTY_FIXED_FILTERS: SearchParams = {}
export const DEFAULT_PAGE_SIZE = 30

/** 选单器主表日期展示：X年M月D日，月/日不足两位补零。 */
function formatCnDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return formatCellValueDateFallback(value)
  }
  const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) {
    return formatCellValueDateFallback(value)
  }
  const [, year, month, day] = match
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`
}

function formatCellValueDateFallback(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}

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
  detailExpandedRowKeys: [],
  inlineDetailItems: {},
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
      return detail
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
  if (candidateQueryType === 'sales-order-purchase-source') {
    return 'sales-order-purchase-source'
  }
  if (candidateQueryType === 'sales-order-outbound-import') {
    return 'sales-order-outbound-import'
  }
  if (candidateQueryType === 'freight-sales-order-import') {
    return 'freight-sales-order-import'
  }
  return candidateStatementModuleKey || parentModuleKey
}

function buildOverlayFilterConfig(
  parentModuleKey: string,
  pageConfig: ModulePageConfig,
  fixedFilters: SearchParams,
  candidateFilterContract?: ParentCandidateFilterContract,
): ModulePageConfig {
  const endpointConfig =
    candidateFilterContract || getModuleConfig(parentModuleKey)
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
  hiddenSelectorColumnKeys,
  fixedFilters = EMPTY_FIXED_FILTERS,
  title,
  onSelect,
  onClose,
}: ModuleParentSelectorOverlayContentProps) {
  const { t } = useTranslation()
  const effectiveTitle = title ?? t('modules.parentSelector.title')
  const { formatCellValue } = useModuleDisplaySupport()
  const defaultPageSize = useDefaultPageSize()
  const [state, setState] = usePatchState<ParentSelectorState>(
    parentSelectorInitialState,
  )
  const detailRequestSequenceRef = useRef(0)
  const detailRequestVersionsRef = useRef(new Map<string, number>())
  useEffect(() => {
    setState({ page: 1, pageSize: defaultPageSize })
  }, [defaultPageSize, setState])
  const {
    draftFilters,
    submittedFilters,
    page,
    pageSize,
    selectedRowKeys,
    selectedRecordMap,
    detailExpandedRowKeys,
    inlineDetailItems,
  } = state
  const displayFieldKey =
    parentDisplayFieldKey ||
    parentDisplayFieldFallbackMap[parentModuleKey] ||
    'id'
  const detailModuleKey = candidateStatementModuleKey || parentModuleKey
  const effectiveFixedFilters = compactParentSelectorFilters(fixedFilters)
  const effectiveSubmittedFilters = mergeParentSelectorFilters(
    submittedFilters,
    effectiveFixedFilters,
  )
  const dedicatedCandidateSource =
    candidateQueryType || candidateStatementModuleKey
  const candidateFilterContract = dedicatedCandidateSource
    ? getParentCandidateFilterContract(dedicatedCandidateSource)
    : undefined
  const dedicatedCandidateFilters = candidateFilterContract
    ? buildFilterParamsFromContract(
        candidateFilterContract,
        effectiveSubmittedFilters,
      )
    : undefined

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
        candidateFilterContract,
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
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'purchase-order-import') {
        return listPurchaseOrderInboundImportCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'sales-order-purchase-source') {
        return listSalesOrderPurchaseSourceCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'sales-order-outbound-import') {
        return listSalesOrderOutboundImportCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'freight-sales-order-import') {
        return listFreightSalesOrderCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
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
  const dataColumns: ColumnsType<ModuleRecord> =
    resolveVisibleParentSelectorColumns(
      resolveParentSelectorColumns(parentModuleKey, displayFieldKey),
      hiddenSelectorColumnKeys,
    ).map((column) => ({
      dataIndex: column.dataIndex,
      title: column.title,
      width: column.width,
      ellipsis: true,
      align:
        column.type === 'amount' || column.type === 'weight'
          ? 'right'
          : 'center',
      render: (value: unknown, record: ModuleRecord) => {
        if (column.type === 'status') {
          const status = getDisplayStatus(record, column.dataIndex)
          return (
            <StatusTag
              status={status}
              statusMap={statusMap}
              fallback={status}
            />
          )
        }
        if (isDocumentReferenceField(column.dataIndex)) {
          return (
            <DocumentReferencePopover
              value={value}
              fieldKey={column.dataIndex}
              moduleKey={parentModuleKey}
              contextModuleKey={parentModuleKey}
              documentLabel={column.title}
              summary={{
                counterpartyName:
                  typeof record.customerName === 'string'
                    ? record.customerName
                    : typeof record.supplierName === 'string'
                      ? record.supplierName
                      : typeof record.carrierName === 'string'
                        ? record.carrierName
                        : undefined,
                amount:
                  typeof record.totalAmount === 'number' ||
                  typeof record.totalAmount === 'string'
                    ? record.totalAmount
                    : undefined,
                status: getDisplayStatus(record, column.dataIndex),
              }}
              statusMap={statusMap}
            />
          )
        }
        if (column.type === 'date') {
          return formatCnDate(value)
        }
        return formatCellValue(value, column.type)
      },
    }))
  const detailToggleColumn: ColumnsType<ModuleRecord>[number] = {
    key: DETAIL_TOGGLE_COLUMN_ID,
    title: '',
    width: DETAIL_TOGGLE_COLUMN_WIDTH,
    fixed: 'left',
    render: (_: unknown, record: ModuleRecord) => {
      const expanded = detailExpandedRowKeys.includes(String(record.id))
      const label = expanded
        ? t('modules.parentSelector.collapseDetail')
        : t('modules.parentSelector.expandDetail')
      return (
        <Tooltip title={label}>
          <Button
            aria-label={label}
            aria-expanded={expanded}
            className={`table-detail-toggle-btn parent-selector-detail-toggle-btn${
              expanded ? ' is-active' : ''
            }`}
            icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              toggleDetail(record)
            }}
            size="small"
            type="text"
          />
        </Tooltip>
      )
    },
  }
  const columns: ColumnsType<ModuleRecord> = [
    detailToggleColumn,
    ...dataColumns,
  ]
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

  /** 单选模式：点行/单选钮仅选中该行，导入需经底部确认栏。 */
  const selectSingleRecord = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    setState({
      selectedRowKeys: [recordKey],
      selectedRecordMap: { [recordKey]: record },
    })
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setState({
      page: nextPage,
      pageSize: nextPageSize !== pageSize ? nextPageSize : pageSize,
    })
  }

  const setInlineDetailItem = useCallback(
    (
      recordId: string,
      updater: (
        prev: ParentSelectorInlineDetailItem,
      ) => ParentSelectorInlineDetailItem,
    ) => {
      setState((prev) => ({
        inlineDetailItems: {
          ...prev.inlineDetailItems,
          [recordId]: updater(
            prev.inlineDetailItems[recordId] || {
              record: null,
              loading: false,
              error: null,
            },
          ),
        },
      }))
    },
    [setState],
  )

  const loadDetailRecord = useCallback(
    async (recordId: string) => {
      const requestVersion = ++detailRequestSequenceRef.current
      detailRequestVersionsRef.current.set(recordId, requestVersion)
      setInlineDetailItem(recordId, (prev) => ({
        ...prev,
        loading: true,
        error: null,
      }))
      try {
        const record = await getBusinessModuleDetail(detailModuleKey, recordId)
        if (detailRequestVersionsRef.current.get(recordId) !== requestVersion) {
          return
        }
        setInlineDetailItem(recordId, (prev) => ({
          ...prev,
          record,
          loading: false,
        }))
      } catch (error) {
        if (detailRequestVersionsRef.current.get(recordId) !== requestVersion) {
          return
        }
        setInlineDetailItem(recordId, (prev) => ({
          ...prev,
          record: null,
          loading: false,
          error,
        }))
      }
    },
    [detailModuleKey, setInlineDetailItem],
  )

  const toggleDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    if (!recordId) return
    if (detailExpandedRowKeys.includes(recordId)) {
      detailRequestVersionsRef.current.delete(recordId)
      setState((prev) => {
        const nextInlineDetailItems = { ...prev.inlineDetailItems }
        delete nextInlineDetailItems[recordId]
        return {
          detailExpandedRowKeys: prev.detailExpandedRowKeys.filter(
            (key) => key !== recordId,
          ),
          inlineDetailItems: nextInlineDetailItems,
        }
      })
      return
    }
    const hasInlineItems = !needsParentDetail(record)
    setState((prev) => ({
      detailExpandedRowKeys: [...prev.detailExpandedRowKeys, recordId],
      inlineDetailItems: {
        ...prev.inlineDetailItems,
        [recordId]: {
          record: hasInlineItems ? record : null,
          loading: !hasInlineItems,
          error: null,
        },
      },
    }))
    if (!hasInlineItems) {
      void loadDetailRecord(recordId)
    }
  }

  const retryDetail = (recordId: string) => {
    if (inlineDetailItems[recordId]) {
      void loadDetailRecord(recordId)
    }
  }

  const copyDocNo = useCallback(async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    const input = document.createElement('textarea')
    input.value = text
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    const copied = document.execCommand('copy')
    input.remove()
    if (!copied) {
      throw new Error('clipboard unavailable')
    }
  }, [])

  const renderDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    const detailRecord = inlineDetailItems[recordId]?.record ?? record
    const lineCount = Array.isArray(detailRecord.items)
      ? detailRecord.items.length
      : 0
    const importableQty = Number(record.importableQuantity)
    const docNo = asString(record[displayFieldKey]).trim() || recordId
    const content = !parentPageConfig ? (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
      </div>
    ) : (
      (() => {
        const item = inlineDetailItems[recordId]
        return (
          <ModuleRecordDetailInline
            config={parentPageConfig}
            record={item?.record ?? null}
            loading={item?.loading ?? false}
            error={item?.error ?? null}
            onRetry={() => retryDetail(recordId)}
          />
        )
      })()
    )
    return (
      <div className="parent-selector-detail-panel">
        <div className="parent-selector-detail-summary">
          <span>
            {t('modules.parentSelector.detailLines', { count: lineCount })}
          </span>
          {Number.isFinite(importableQty) && importableQty > 0 ? (
            <span>
              {t('modules.parentSelector.detailImportable', {
                count: importableQty,
              })}
            </span>
          ) : null}
          <span>
            {t('modules.parentSelector.column.docNo')}：
            <span className="parent-selector-detail-summary-docno">
              {docNo}
            </span>
            <button
              type="button"
              className="parent-selector-copy-btn"
              aria-label={t('common.copy')}
              onClick={(event) => {
                event.stopPropagation()
                void copyDocNo(docNo)
                  .then(() =>
                    message.success(t('modules.parentSelector.copied')),
                  )
                  .catch(() => {
                    /* 忽略剪贴板不可用场景 */
                  })
              }}
            >
              ⧉
            </button>
          </span>
        </div>
        {content}
      </div>
    )
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

  const selectedOrderCount = selectedRows.length
  const selectedLineCount = selectedRows.reduce(
    (sum, row) => sum + (Array.isArray(row.items) ? row.items.length : 0),
    0,
  )
  const hasImportableQuantity = selectedRows.some((row) =>
    Number.isFinite(Number(row.importableQuantity)),
  )
  const selectedImportableQuantity = selectedRows.reduce(
    (sum, row) => sum + Math.max(Number(row.importableQuantity) || 0, 0),
    0,
  )
  const selectedSummary = allowMultipleSelection
    ? hasImportableQuantity
      ? t('modules.parentSelector.selectedMultiSummary', {
          orderCount: selectedOrderCount,
          lineCount: selectedLineCount,
          importableQuantity: selectedImportableQuantity,
        })
      : t('modules.parentSelector.selectedMultiSummarySimple', {
          orderCount: selectedOrderCount,
          lineCount: selectedLineCount,
        })
    : selectedOrderCount
      ? t('modules.parentSelector.selectedSingleSummary', {
          count: selectedOrderCount,
          docNo:
            asString(selectedRows[0]?.[displayFieldKey]).trim() ||
            asString(selectedRows[0]?.id),
        })
      : t('modules.parentSelector.selectedEmptyHint')

  return {
    allowMultipleSelection,
    applyFilters,
    columns,
    detailExpandedRowKeys,
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
    renderDetail,
    resetFilters,
    selectSingleRecord,
    selectedRows,
    selectedRowKeys,
    selectedSummary,
    submittedFilters,
    t,
    toggleDetail,
    toggleRecordSelection,
    total,
    updateFilter,
  }
}
