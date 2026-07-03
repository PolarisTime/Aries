import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import i18next from 'i18next'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail, listBusinessModule } from '@/api/business'
import { buildFilterParams } from '@/api/business-listing-filtering'
import { listFreightBillImportCandidatePage } from '@/api/freight-bill-candidates'
import { getModuleConfig } from '@/api/module-contracts'
import { listPurchaseOrderImportCandidatePage } from '@/api/purchase-order-candidates'
import { listSalesOrderOutboundImportCandidatePage } from '@/api/sales-order-candidates'
import { listStatementCandidatePage } from '@/api/statements'
import { StatusTag } from '@/components/StatusTag'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { QUERY_KEYS } from '@/constants/query-keys'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { ModuleFilterToolbar } from './ModuleFilterToolbar'
import {
  filterImportableParentRecords,
  resolveSelectedParentRows,
  resolveVisibleParentSelectorColumns,
} from './module-parent-selector-utils'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
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

const parentDisplayFieldFallbackMap: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
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

const DEFAULT_PAGE_SIZE = 15
const EMPTY_FIXED_FILTERS: SearchParams = {}
const PARENT_SELECTOR_ROW_EXCLUSION_SELECTOR =
  '.ant-table-selection-column, .parent-selector-selected-chip-remove'

type ParentSelectorTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

type ParentSelectorFormatCellValue = (
  value: unknown,
  type?: 'date' | 'amount' | 'weight' | 'status',
) => string

function getOverlayStatusMap() {
  return {
    [DOCUMENT_STATUS.DRAFT]: {
      color: 'default',
      text: i18next.t('modules.parentSelector.status.draft'),
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
  if (candidateQueryType === 'freight-bill-import') {
    return 'freight-bill-import'
  }
  if (candidateQueryType === 'sales-order-outbound-import') {
    return 'sales-order-outbound-import'
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
    Object.entries(fixedFilters).flatMap(([key, value]) => {
      if (value === undefined || value === null) return []
      if (typeof value === 'string' && !value.trim()) return []
      return [key]
    }),
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

function buildSelectedRecordSummary(
  record: ModuleRecord,
  parentModuleKey: string,
  displayFieldKey: string,
  formatValue: (
    value: unknown,
    type?: 'date' | 'amount' | 'weight' | 'status',
  ) => string,
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
    status: asString(record.status).trim(),
  }
}

type ParentSelectorContentProps = Omit<Props, 'open'>

interface ParentSelectorState {
  draftFilters: SearchParams
  submittedFilters: SearchParams
  page: number
  pageSize: number
  selectedRowKeys: string[]
  selectedRecordMap: Record<string, ModuleRecord>
}

const parentSelectorInitialState: ParentSelectorState = {
  draftFilters: {},
  submittedFilters: {},
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  selectedRowKeys: [],
  selectedRecordMap: {},
}

interface ParentSelectorSelectedPanelProps {
  displayFieldKey: string
  formatCellValue: ParentSelectorFormatCellValue
  onClear: () => void
  onRemove: (recordId: string) => void
  parentModuleKey: string
  selectedRows: ModuleRecord[]
  t: ParentSelectorTranslator
}

function ParentSelectorSelectedPanel({
  displayFieldKey,
  formatCellValue,
  onClear,
  onRemove,
  parentModuleKey,
  selectedRows,
  t,
}: ParentSelectorSelectedPanelProps) {
  return (
    <div className="parent-selector-selected-panel">
      <div className="parent-selector-selected-header">
        <span className="parent-selector-selected-title">
          {t('modules.parentSelector.selectedDocuments')}
          <span className="parent-selector-selected-count">
            {selectedRows.length
              ? t('modules.parentSelector.selectedDocumentsCount', {
                  count: selectedRows.length,
                })
              : t('modules.parentSelector.selectedDocumentsCount', {
                  count: 0,
                })}
          </span>
        </span>
        <Button disabled={!selectedRows.length} onClick={onClear}>
          {t('modules.parentSelector.clearSelected')}
        </Button>
      </div>
      {selectedRows.length ? (
        <div className="parent-selector-selected-list">
          {selectedRows.map((record) => {
            const recordId = String(record.id)
            const summary = buildSelectedRecordSummary(
              record,
              parentModuleKey,
              displayFieldKey,
              formatCellValue,
            )

            return (
              <div key={recordId} className="parent-selector-selected-chip">
                <div className="parent-selector-selected-chip-main">
                  <div className="parent-selector-selected-chip-top">
                    <span className="parent-selector-selected-chip-title">
                      {summary.primary}
                    </span>
                    {summary.status ? (
                      <StatusTag
                        status={summary.status}
                        statusMap={getOverlayStatusMap()}
                        fallback={summary.status}
                      />
                    ) : null}
                  </div>
                  {summary.meta.length ? (
                    <div className="parent-selector-selected-chip-meta">
                      {summary.meta.map((item) => (
                        <span
                          key={`${recordId}-${item}`}
                          className="parent-selector-selected-chip-desc"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="parent-selector-selected-chip-desc">
                      {t('modules.parentSelector.selectedDocuments')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="parent-selector-selected-chip-remove"
                  onClick={() => onRemove(recordId)}
                  aria-label={t('modules.parentSelector.removeAriaLabel', {
                    name: summary.primary,
                  })}
                >
                  <CloseOutlined />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="parent-selector-selected-empty">
          {t('modules.parentSelector.noSelectionHint')}
        </div>
      )}
    </div>
  )
}

interface ParentSelectorFooterProps {
  disabled: boolean
  onCancel: () => void
  onConfirm: () => void
  selectedCount: number
  t: ParentSelectorTranslator
}

function ParentSelectorFooter({
  disabled,
  onCancel,
  onConfirm,
  selectedCount,
  t,
}: ParentSelectorFooterProps) {
  return (
    <div className="flex justify-between items-center gap-12">
      <span className="text-secondary">
        {t('modules.parentSelector.selectedCount', {
          count: selectedCount,
        })}
      </span>
      <div className="flex gap-8">
        <Button onClick={onCancel}>{t('modules.parentSelector.cancel')}</Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={disabled}
          onClick={onConfirm}
        >
          {t('modules.parentSelector.confirmImport')}
        </Button>
      </div>
    </div>
  )
}

interface ParentSelectorTopProps {
  allowMultipleSelection: boolean
  displayFieldKey: string
  draftFilters: SearchParams
  formatCellValue: ParentSelectorFormatCellValue
  submittedFilters: SearchParams
  onClearSelectedRecords: () => void
  onApplyFilters: (filters: SearchParams) => void
  onRemoveSelectedRecord: (recordId: string) => void
  onResetFilters: () => void
  onUpdateFilter: (key: string, value: unknown) => void
  overlayFilterConfig?: ModulePageConfig
  parentModuleKey: string
  selectedRows: ModuleRecord[]
  t: ParentSelectorTranslator
}

function ParentSelectorTop({
  allowMultipleSelection,
  displayFieldKey,
  draftFilters,
  formatCellValue,
  submittedFilters,
  onClearSelectedRecords,
  onApplyFilters,
  onRemoveSelectedRecord,
  onResetFilters,
  onUpdateFilter,
  overlayFilterConfig,
  parentModuleKey,
  selectedRows,
  t,
}: ParentSelectorTopProps) {
  return (
    <div className="parent-selector-top">
      {overlayFilterConfig ? (
        <ModuleFilterToolbar
          config={overlayFilterConfig}
          filters={draftFilters}
          defaultFilters={{}}
          submittedFilters={submittedFilters}
          onUpdateFilter={onUpdateFilter}
          onApplyFilters={onApplyFilters}
          onReset={onResetFilters}
        />
      ) : null}
      {allowMultipleSelection ? (
        <ParentSelectorSelectedPanel
          displayFieldKey={displayFieldKey}
          formatCellValue={formatCellValue}
          onClear={onClearSelectedRecords}
          onRemove={onRemoveSelectedRecord}
          parentModuleKey={parentModuleKey}
          selectedRows={selectedRows}
          t={t}
        />
      ) : null}
    </div>
  )
}

interface ParentSelectorTableProps {
  allowMultipleSelection: boolean
  columns: ColumnsType<ModuleRecord>
  loading: boolean
  onImportRecord: (record: ModuleRecord) => void
  onPageChange: (page: number, pageSize: number) => void
  onSelectedRowsChange: (keys: React.Key[], rows: ModuleRecord[]) => void
  onToggleRecordSelection: (record: ModuleRecord) => void
  page: number
  pageSize: number
  records: ModuleRecord[]
  selectedRowKeys: string[]
  t: ParentSelectorTranslator
  total: number
}

function ParentSelectorTable({
  allowMultipleSelection,
  columns,
  loading,
  onImportRecord,
  onPageChange,
  onSelectedRowsChange,
  onToggleRecordSelection,
  page,
  pageSize,
  records,
  selectedRowKeys,
  t,
  total,
}: ParentSelectorTableProps) {
  const shouldIgnoreRowInteraction = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest(PARENT_SELECTOR_ROW_EXCLUSION_SELECTOR))

  const handleRowAction = (record: ModuleRecord) => {
    if (allowMultipleSelection) {
      onToggleRecordSelection(record)
      return
    }
    onImportRecord(record)
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      scroll={{ x: 'max-content' }}
      rowSelection={
        allowMultipleSelection
          ? {
              preserveSelectedRowKeys: true,
              selectedRowKeys,
              onChange: onSelectedRowsChange,
            }
          : undefined
      }
      onRow={(record) => ({
        tabIndex: 0,
        'aria-selected': allowMultipleSelection
          ? selectedRowKeys.includes(String(record.id))
          : undefined,
        onClick: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          handleRowAction(record)
        },
        onKeyDown: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          if (event.key === ' ' || event.key === 'Spacebar') {
            if (!allowMultipleSelection) return
            event.preventDefault()
            onToggleRecordSelection(record)
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            handleRowAction(record)
          }
        },
        style: { cursor: 'pointer' },
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: ['15', '30', '50'],
        showTotal: (count) =>
          t('modules.parentSelector.paginationTotal', { count }),
        onChange: onPageChange,
      }}
    />
  )
}

export function ModuleParentSelectorOverlay({
  open,
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
}: Props) {
  if (!open) return null

  return (
    <ModuleParentSelectorOverlayContent
      key={`${parentModuleKey}:${parentDisplayFieldKey || ''}:${allowMultipleSelection ? 'multi' : 'single'}`}
      parentModuleKey={parentModuleKey}
      parentDisplayFieldKey={parentDisplayFieldKey}
      allowMultipleSelection={allowMultipleSelection}
      candidateStatementModuleKey={candidateStatementModuleKey}
      candidateQueryType={candidateQueryType}
      candidateUsage={candidateUsage}
      hiddenSelectorColumnKeys={hiddenSelectorColumnKeys}
      fixedFilters={fixedFilters}
      title={title}
      onSelect={onSelect}
      onClose={onClose}
    />
  )
}

function ModuleParentSelectorOverlayContent({
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
}: ParentSelectorContentProps) {
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
  const effectiveSubmittedFilters = {
    ...submittedFilters,
    ...fixedFilters,
  }

  const { data: parentPageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorConfig(parentModuleKey),
    queryFn: () => loadBusinessPageConfig(parentModuleKey),
    enabled: !!parentModuleKey,
    staleTime: Infinity,
  })

  const overlayFilterConfig = parentPageConfig
    ? buildOverlayFilterConfig(parentModuleKey, parentPageConfig, fixedFilters)
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
      render: (value: unknown) => {
        if (column.type === 'status') {
          return (
            <StatusTag
              status={asString(value)}
              statusMap={getOverlayStatusMap()}
              fallback={asString(value)}
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

  return (
    <WorkspaceOverlay
      title={effectiveTitle}
      open
      onClose={onClose}
      className="workspace-overlay-panel--parent-selector"
      footer={
        allowMultipleSelection ? (
          <ParentSelectorFooter
            disabled={!selectedRows.length}
            onCancel={onClose}
            onConfirm={() => {
              void handleImportRecords(selectedRows)
            }}
            selectedCount={selectedRows.length}
            t={t}
          />
        ) : undefined
      }
      variant="workspace"
      width="100%"
      height="100%"
      zIndex={1100}
    >
      <ParentSelectorTop
        allowMultipleSelection={allowMultipleSelection}
        displayFieldKey={displayFieldKey}
        draftFilters={draftFilters}
        formatCellValue={formatCellValue}
        submittedFilters={submittedFilters}
        onClearSelectedRecords={handleClearSelectedRecords}
        onApplyFilters={applyFilters}
        onRemoveSelectedRecord={removeSelectedRecord}
        onResetFilters={resetFilters}
        onUpdateFilter={updateFilter}
        overlayFilterConfig={overlayFilterConfig}
        parentModuleKey={parentModuleKey}
        selectedRows={selectedRows}
        t={t}
      />
      <ParentSelectorTable
        allowMultipleSelection={allowMultipleSelection}
        columns={columns}
        loading={isLoading || isFetching || isConfigLoading}
        onImportRecord={(record) => {
          void handleImportRecords([record])
        }}
        onPageChange={handlePageChange}
        onSelectedRowsChange={handleSelectedRowsChange}
        onToggleRecordSelection={toggleRecordSelection}
        page={page}
        pageSize={pageSize}
        records={records}
        selectedRowKeys={selectedRowKeys}
        t={t}
        total={total}
      />
    </WorkspaceOverlay>
  )
}
