import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import type { ColumnsType } from 'antd/es/table'
import Table from 'antd/es/table'
import { useReducer } from 'react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { listBusinessModule } from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import { StatusTag } from '@/components/StatusTag'
import { QUERY_KEYS } from '@/constants/query-keys'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  filterImportableParentRecords,
  resolveSelectedParentRows,
} from './module-parent-selector-utils'
import { ModuleFilterToolbar } from './ModuleFilterToolbar'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  parentModuleKey: string
  parentDisplayFieldKey?: string
  allowMultipleSelection?: boolean
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

function getOverlayStatusMap() {
  return {
    草稿: { color: 'default', text: i18next.t('modules.parentSelector.status.draft') },
    未审核: { color: 'default', text: i18next.t('modules.parentSelector.status.unaudited') },
    已审核: { color: 'processing', text: i18next.t('modules.parentSelector.status.audited') },
    已收票: { color: 'success', text: i18next.t('modules.parentSelector.status.invoiceReceived') },
    已开票: { color: 'success', text: i18next.t('modules.parentSelector.status.invoiceIssued') },
    完成采购: { color: 'success', text: i18next.t('modules.parentSelector.status.purchaseComplete') },
    完成销售: { color: 'success', text: i18next.t('modules.parentSelector.status.salesComplete') },
    完成入库: { color: 'success', text: i18next.t('modules.parentSelector.status.inboundComplete') },
  }
}

function getParentSelectorColumnMap(): Record<string, OverlayColumn[]> {
  return {
    'purchase-order': [
      { dataIndex: 'orderNo', title: i18next.t('modules.parentSelector.column.orderNo'), width: 160 },
      { dataIndex: 'supplierName', title: i18next.t('modules.parentSelector.column.supplierName'), width: 180 },
      { dataIndex: 'buyerName', title: i18next.t('modules.parentSelector.column.buyerName'), width: 120 },
      { dataIndex: 'orderDate', title: i18next.t('modules.parentSelector.column.orderDate'), width: 130, type: 'date' },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      { dataIndex: 'totalAmount', title: i18next.t('modules.parentSelector.column.totalAmount'), width: 120, type: 'amount' },
      { dataIndex: 'status', title: i18next.t('modules.parentSelector.column.status'), width: 110, type: 'status' },
    ],
    'sales-order': [
      { dataIndex: 'orderNo', title: i18next.t('modules.parentSelector.column.orderNo'), width: 160 },
      { dataIndex: 'purchaseOrderNo', title: i18next.t('modules.parentSelector.column.relatedPurchaseOrder'), width: 180 },
      { dataIndex: 'customerName', title: i18next.t('modules.parentSelector.column.customerName'), width: 160 },
      { dataIndex: 'projectName', title: i18next.t('modules.parentSelector.column.projectName'), width: 180 },
      { dataIndex: 'deliveryDate', title: i18next.t('modules.parentSelector.column.deliveryDate'), width: 130, type: 'date' },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      { dataIndex: 'totalAmount', title: i18next.t('modules.parentSelector.column.totalAmount'), width: 120, type: 'amount' },
      { dataIndex: 'status', title: i18next.t('modules.parentSelector.column.status'), width: 110, type: 'status' },
    ],
    'sales-outbound': [
      { dataIndex: 'outboundNo', title: i18next.t('modules.parentSelector.column.outboundNo'), width: 160 },
      { dataIndex: 'salesOrderNo', title: i18next.t('modules.parentSelector.column.relatedOrder'), width: 160 },
      { dataIndex: 'customerName', title: i18next.t('modules.parentSelector.column.customerName'), width: 160 },
      { dataIndex: 'projectName', title: i18next.t('modules.parentSelector.column.projectName'), width: 180 },
      { dataIndex: 'outboundDate', title: i18next.t('modules.parentSelector.column.outboundDate'), width: 130, type: 'date' },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      { dataIndex: 'totalAmount', title: i18next.t('modules.parentSelector.column.totalAmount'), width: 120, type: 'amount' },
      { dataIndex: 'status', title: i18next.t('modules.parentSelector.column.status'), width: 110, type: 'status' },
    ],
    'purchase-inbound': [
      { dataIndex: 'inboundNo', title: i18next.t('modules.parentSelector.column.inboundNo'), width: 160 },
      { dataIndex: 'purchaseOrderNo', title: i18next.t('modules.parentSelector.column.relatedOrder'), width: 160 },
      { dataIndex: 'supplierName', title: i18next.t('modules.parentSelector.column.supplierName'), width: 180 },
      { dataIndex: 'inboundDate', title: i18next.t('modules.parentSelector.column.inboundDate'), width: 130, type: 'date' },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      { dataIndex: 'totalAmount', title: i18next.t('modules.parentSelector.column.totalAmount'), width: 120, type: 'amount' },
      { dataIndex: 'status', title: i18next.t('modules.parentSelector.column.status'), width: 110, type: 'status' },
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
    { dataIndex: displayFieldKey, title: i18next.t('modules.parentSelector.column.docNo'), width: 180 },
    { dataIndex: 'status', title: i18next.t('modules.parentSelector.column.status'), width: 110, type: 'status' },
  ]
}

function normalizeFilterValues(filters: SearchParams) {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  )
}

function buildOverlayFilterConfig(
  parentModuleKey: string,
  pageConfig: ModulePageConfig,
): ModulePageConfig {
  const endpointConfig = getModuleConfig(parentModuleKey)
  const nativeFilterKeys = new Set(endpointConfig.nativeFilterKeys || [])
  const dateRangeKeys = new Set(
    Object.keys(endpointConfig.dateRangeMapping || {}),
  )

  const supportedFilters = pageConfig.filters.filter((filter) => {
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
      placeholder: i18next.t('modules.parentSelector.filter.keywordPlaceholder'),
    })
  }

  return {
    ...pageConfig,
    filters: supportedFilters,
  }
}

function getSelectedRecordSummaryFieldMap(): Record<string, SelectedSummaryField[]> {
  return {
    'purchase-order': [
      { key: 'supplierName', label: i18next.t('modules.parentSelector.summary.supplierName') },
      { key: 'buyerName', label: i18next.t('modules.parentSelector.summary.buyerName') },
      { key: 'orderDate', label: i18next.t('modules.parentSelector.summary.orderDate'), type: 'date' },
    ],
    'purchase-inbound': [
      { key: 'supplierName', label: i18next.t('modules.parentSelector.summary.supplierName') },
      { key: 'purchaseOrderNo', label: i18next.t('modules.parentSelector.summary.relatedOrder') },
      { key: 'inboundDate', label: i18next.t('modules.parentSelector.summary.inboundDate'), type: 'date' },
    ],
    'sales-order': [
      { key: 'customerName', label: i18next.t('modules.parentSelector.summary.customerName') },
      { key: 'projectName', label: i18next.t('modules.parentSelector.summary.projectName') },
      { key: 'deliveryDate', label: i18next.t('modules.parentSelector.summary.deliveryDate'), type: 'date' },
    ],
    'sales-outbound': [
      { key: 'customerName', label: i18next.t('modules.parentSelector.summary.customerName') },
      { key: 'projectName', label: i18next.t('modules.parentSelector.summary.projectName') },
      { key: 'outboundDate', label: i18next.t('modules.parentSelector.summary.outboundDate'), type: 'date' },
    ],
    'freight-bill': [
      { key: 'carrierName', label: i18next.t('modules.parentSelector.summary.carrierName') },
      { key: 'outboundNo', label: i18next.t('modules.parentSelector.summary.relatedOutbound') },
      { key: 'billTime', label: i18next.t('modules.parentSelector.summary.billTime'), type: 'date' },
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
  const meta = (getSelectedRecordSummaryFieldMap()[parentModuleKey] || []).flatMap(
    (field) => {
      const rawValue =
        field.type != null
          ? formatValue(record[field.key], field.type)
          : asString(record[field.key]).trim()
      const value = String(rawValue || '').trim()
      return value ? [`${field.label}：${value}`] : []
    },
  )

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
  formatCellValue: (
    value: unknown,
    type?: 'date' | 'amount' | 'weight' | 'status',
  ) => string
  onClear: () => void
  onRemove: (recordId: string) => void
  parentModuleKey: string
  selectedRows: ModuleRecord[]
  t: (key: string, options?: Record<string, unknown>) => string
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

export function ModuleParentSelectorOverlay({
  open,
  parentModuleKey,
  parentDisplayFieldKey,
  allowMultipleSelection = false,
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

  const { data: parentPageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorConfig(parentModuleKey),
    queryFn: () => loadBusinessPageConfig(parentModuleKey),
    enabled: !!parentModuleKey,
    staleTime: Infinity,
  })

  const overlayFilterConfig = parentPageConfig
    ? buildOverlayFilterConfig(parentModuleKey, parentPageConfig)
    : undefined

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorList(
      parentModuleKey,
      submittedFilters,
      page,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      listBusinessModule(
        parentModuleKey,
        submittedFilters,
        {
          currentPage: page,
          pageSize,
        },
        { signal },
      ),
    enabled: !!parentModuleKey,
    placeholderData: keepPreviousData,
  })

  const records = filterImportableParentRecords(
    parentModuleKey,
    data?.data?.rows || [],
  )
  const total = Number(data?.data?.total || 0)

  const columns: ColumnsType<ModuleRecord> = resolveParentSelectorColumns(
    parentModuleKey,
    displayFieldKey,
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

  const buildSubmittedFilters = () =>
    Object.fromEntries(
      Object.entries(normalizeFilterValues(draftFilters)).filter(
        ([, value]) => {
          if (value === undefined || value === null) return false
          if (typeof value === 'string') return value.length > 0
          return true
        },
      ),
    )

  const submitFilters = () => {
    setState({
      page: 1,
      submittedFilters: buildSubmittedFilters(),
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

  return (
    <WorkspaceOverlay
      title={effectiveTitle}
      open
      onClose={onClose}
      className="workspace-overlay-panel--parent-selector"
      footer={
        allowMultipleSelection ? (
          <div className="flex justify-between items-center gap-12">
            <span className="text-secondary">
              {t('modules.parentSelector.selectedCount', { count: selectedRows.length })}
            </span>
            <div className="flex gap-8">
              <Button onClick={onClose}>{t('modules.parentSelector.cancel')}</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={!selectedRows.length}
                onClick={() => {
                  onSelect(selectedRows)
                  onClose()
                }}
              >
                {t('modules.parentSelector.confirmImport')}
              </Button>
            </div>
          </div>
        ) : undefined
      }
      variant="workspace"
      width="100%"
      height="100%"
      zIndex={1100}
    >
      <div className="parent-selector-top">
        {overlayFilterConfig ? (
          <ModuleFilterToolbar
            config={overlayFilterConfig}
            filters={draftFilters}
            onUpdateFilter={updateFilter}
            onSearch={submitFilters}
            onReset={resetFilters}
          />
        ) : null}
        {allowMultipleSelection ? (
          <ParentSelectorSelectedPanel
            displayFieldKey={displayFieldKey}
            formatCellValue={formatCellValue}
            onClear={handleClearSelectedRecords}
            onRemove={removeSelectedRecord}
            parentModuleKey={parentModuleKey}
            selectedRows={selectedRows}
            t={t}
          />
        ) : null}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={isLoading || isFetching || isConfigLoading}
        scroll={{ x: 'max-content' }}
        rowSelection={
          allowMultipleSelection
            ? {
                preserveSelectedRowKeys: true,
                selectedRowKeys,
                onChange: handleSelectedRowsChange,
              }
            : undefined
        }
        onRow={(record) => ({
          onClick: (event) => {
            if (allowMultipleSelection) {
              const target = event.target as HTMLElement | null
              if (
                target?.closest(
                  '.ant-table-selection-column, .parent-selector-selected-chip-remove',
                )
              ) {
                return
              }
              toggleRecordSelection(record)
              return
            }
            onSelect([record])
            onClose()
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['15', '30', '50'],
          showTotal: (count) => t('modules.parentSelector.paginationTotal', { count }),
          onChange: handlePageChange,
        }}
      />
    </WorkspaceOverlay>
  )
}
