/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { asString } from '@/utils/type-narrowing'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { StatusTag } from '@/components/StatusTag'
import { listBusinessModule } from '@/api/business'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { getModuleConfig } from '@/api/module-contracts'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import Button from 'antd/es/button'
import Table from 'antd/es/table'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { compactSearch } from '@/utils/list'
import type {
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
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

const overlayStatusMap = {
  草稿: { color: 'default', text: '草稿' },
  未审核: { color: 'default', text: '未审核' },
  已审核: { color: 'processing', text: '已审核' },
  已收票: { color: 'success', text: '已收票' },
  已开票: { color: 'success', text: '已开票' },
  完成采购: { color: 'success', text: '完成采购' },
  完成销售: { color: 'success', text: '完成销售' },
  完成入库: { color: 'success', text: '完成入库' },
}

const parentSelectorColumnMap: Record<string, OverlayColumn[]> = {
  'purchase-order': [
    { dataIndex: 'orderNo', title: '订单编号', width: 160 },
    { dataIndex: 'supplierName', title: '供应商', width: 180 },
    { dataIndex: 'buyerName', title: '采购员', width: 120 },
    { dataIndex: 'orderDate', title: '订单日期', width: 130, type: 'date' },
    { dataIndex: 'totalWeight', title: '总重量（吨）', width: 130, type: 'weight' },
    { dataIndex: 'totalAmount', title: '总金额', width: 120, type: 'amount' },
    { dataIndex: 'status', title: '状态', width: 110, type: 'status' },
  ],
  'sales-order': [
    { dataIndex: 'orderNo', title: '订单编号', width: 160 },
    { dataIndex: 'purchaseOrderNo', title: '关联采购订单', width: 180 },
    { dataIndex: 'customerName', title: '客户名称', width: 160 },
    { dataIndex: 'projectName', title: '项目名称', width: 180 },
    { dataIndex: 'deliveryDate', title: '送货日期', width: 130, type: 'date' },
    { dataIndex: 'totalWeight', title: '总重量（吨）', width: 130, type: 'weight' },
    { dataIndex: 'totalAmount', title: '总金额', width: 120, type: 'amount' },
    { dataIndex: 'status', title: '状态', width: 110, type: 'status' },
  ],
  'sales-outbound': [
    { dataIndex: 'outboundNo', title: '出库单号', width: 160 },
    { dataIndex: 'salesOrderNo', title: '关联订单', width: 160 },
    { dataIndex: 'customerName', title: '客户名称', width: 160 },
    { dataIndex: 'projectName', title: '项目名称', width: 180 },
    { dataIndex: 'outboundDate', title: '出库日期', width: 130, type: 'date' },
    { dataIndex: 'totalWeight', title: '总重量（吨）', width: 130, type: 'weight' },
    { dataIndex: 'totalAmount', title: '总金额', width: 120, type: 'amount' },
    { dataIndex: 'status', title: '状态', width: 110, type: 'status' },
  ],
  'purchase-inbound': [
    { dataIndex: 'inboundNo', title: '入库单号', width: 160 },
    { dataIndex: 'purchaseOrderNo', title: '关联订单', width: 160 },
    { dataIndex: 'supplierName', title: '供应商', width: 180 },
    { dataIndex: 'inboundDate', title: '入库日期', width: 130, type: 'date' },
    { dataIndex: 'totalWeight', title: '总重量（吨）', width: 130, type: 'weight' },
    { dataIndex: 'totalAmount', title: '总金额', width: 120, type: 'amount' },
    { dataIndex: 'status', title: '状态', width: 110, type: 'status' },
  ],
}

function resolveParentSelectorColumns(
  parentModuleKey: string,
  displayFieldKey: string,
): OverlayColumn[] {
  const configuredColumns = parentSelectorColumnMap[parentModuleKey]
  if (configuredColumns?.length) {
    return configuredColumns
  }
  return [
    { dataIndex: displayFieldKey, title: '单据号', width: 180 },
    { dataIndex: 'status', title: '状态', width: 110, type: 'status' },
  ]
}

function normalizeFilterValues(filters: Record<string, unknown>) {
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
      label: '关键字',
      type: 'input',
      placeholder: '输入单据号或关键词',
    })
  }

  return {
    ...pageConfig,
    filters: supportedFilters,
  }
}

const selectedRecordSummaryFieldMap: Record<string, SelectedSummaryField[]> = {
  'purchase-order': [
    { key: 'supplierName', label: '供应商' },
    { key: 'buyerName', label: '采购员' },
    { key: 'orderDate', label: '订单日期', type: 'date' },
  ],
  'purchase-inbound': [
    { key: 'supplierName', label: '供应商' },
    { key: 'purchaseOrderNo', label: '关联订单' },
    { key: 'inboundDate', label: '入库日期', type: 'date' },
  ],
  'sales-order': [
    { key: 'customerName', label: '客户名称' },
    { key: 'projectName', label: '项目名称' },
    { key: 'deliveryDate', label: '送货日期', type: 'date' },
  ],
  'sales-outbound': [
    { key: 'customerName', label: '客户名称' },
    { key: 'projectName', label: '项目名称' },
    { key: 'outboundDate', label: '出库日期', type: 'date' },
  ],
  'freight-bill': [
    { key: 'carrierName', label: '物流商' },
    { key: 'outboundNo', label: '关联出库单' },
    { key: 'billTime', label: '单据日期', type: 'date' },
  ],
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
  const primary = String(record[displayFieldKey] || record.id || '--')
  const meta = (selectedRecordSummaryFieldMap[parentModuleKey] || [])
    .map((field) => {
      const rawValue =
        field.type != null
          ? formatValue(record[field.key], field.type)
          : asString(record[field.key]).trim()
      const value = String(rawValue || '').trim()
      return value ? `${field.label}：${value}` : ''
    })
    .filter(Boolean)

  return {
    primary,
    meta,
    status: asString(record.status).trim(),
  }
}

export function ModuleParentSelectorOverlay({
  open,
  parentModuleKey,
  parentDisplayFieldKey,
  allowMultipleSelection = false,
  title = '选择父单据',
  onSelect,
  onClose,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const [draftFilters, setDraftFilters] = useState<Record<string, unknown>>({})
  const [submittedFilters, setSubmittedFilters] = useState<
    Record<string, unknown>
  >({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRecordMap, setSelectedRecordMap] = useState<
    Record<string, ModuleRecord>
  >({})
  const displayFieldKey =
    parentDisplayFieldKey ||
    parentDisplayFieldFallbackMap[parentModuleKey] ||
    'id'

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
      setDraftFilters({})
      setSubmittedFilters({})
      setPage(1)
      setPageSize(DEFAULT_PAGE_SIZE)
      setSelectedRowKeys([])
      setSelectedRecordMap({})
      return
    }
    setDraftFilters({})
    setSubmittedFilters({})
    setPage(1)
    setPageSize(DEFAULT_PAGE_SIZE)
    setSelectedRowKeys([])
    setSelectedRecordMap({})
  }, [open, parentModuleKey])

  const { data: parentPageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ['parent-selector-config', parentModuleKey],
    queryFn: () => loadBusinessPageConfig(parentModuleKey),
    enabled: open && !!parentModuleKey,
    staleTime: Infinity,
  })

  const overlayFilterConfig = useMemo(
    () =>
      parentPageConfig
        ? buildOverlayFilterConfig(parentModuleKey, parentPageConfig)
        : undefined,
    [parentModuleKey, parentPageConfig],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'parent-selector-list',
      parentModuleKey,
      submittedFilters,
      page,
      pageSize,
    ],
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
    enabled: open && !!parentModuleKey,
    placeholderData: keepPreviousData,
  })

// eslint-disable-next-line react-hooks/exhaustive-deps

  const records = data?.data?.rows || []
  const total = Number(data?.data?.total || 0)

  const columns = useMemo<ColumnsType<ModuleRecord>>(
    () =>
      resolveParentSelectorColumns(parentModuleKey, displayFieldKey).map(
        (column) => ({
          dataIndex: column.dataIndex,
          title: column.title,
          width: column.width,
          ellipsis: true,
          render: (value: unknown) => {
            if (column.type === 'status') {
              return (
                <StatusTag
                  status={asString(value)}
                  statusMap={overlayStatusMap}
                  fallback={String(value || '--')}
                />
              )
            }
            return formatCellValue(value, column.type)
          },
        }),
      ),
    [displayFieldKey, formatCellValue, parentModuleKey],
  )
  const selectedRows = useMemo(
    () =>
      selectedRowKeys
        .map((key) => selectedRecordMap[String(key)])
        .filter(Boolean),
    [selectedRecordMap, selectedRowKeys],
  )

  useEffect(() => {
    if (!records?.length || !allowMultipleSelection) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
    setSelectedRecordMap((prev) => {
      let changed = false
      const next = { ...prev }
      records.forEach((record) => {
        const key = String(record.id)
        if (
          selectedRowKeys.includes(key) &&
          next[key] !== record
        ) {
          next[key] = record
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [allowMultipleSelection, records, selectedRowKeys])

  const toggleRecordSelection = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    setSelectedRowKeys((prev) => {
      const isSelected = prev.includes(recordKey)
      setSelectedRecordMap((prevMap) => {
        if (isSelected) {
          const next = { ...prevMap }
          delete next[recordKey]
          return next
        }
        return {
          ...prevMap,
          [recordKey]: record,
        }
      })
      return isSelected
        ? prev.filter((key) => key !== recordKey)
        : [...prev, recordKey]
    })
  }

  const updateFilter = (key: string, value: unknown) => {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const submitFilters = () => {
    setPage(1)
    setSubmittedFilters(compactSearch(normalizeFilterValues(draftFilters)))
  }

  const resetFilters = () => {
    setDraftFilters({})
    setSubmittedFilters({})
    setPage(1)
  }

  const removeSelectedRecord = (recordId: string) => {
    setSelectedRowKeys((prev) => prev.filter((key) => key !== recordId))
    setSelectedRecordMap((prev) => {
      if (!prev[recordId]) {
        return prev
      }
      const next = { ...prev }
      delete next[recordId]
      return next
    })
  }

  const clearSelectedRecords = () => {
    setSelectedRowKeys([])
    setSelectedRecordMap({})
  }

  return (
    <WorkspaceOverlay
      title={title}
      open={open}
      onClose={onClose}
      className="workspace-overlay-panel--parent-selector"
      footer={
        allowMultipleSelection ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ color: 'var(--ant-color-text-secondary)' }}>
              已选择 {selectedRows.length} 条
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={onClose}>取消</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={!selectedRows.length}
                onClick={() => {
                  onSelect(selectedRows)
                  onClose()
                }}
              >
                确认导入
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
          <div className="parent-selector-selected-panel">
            <div className="parent-selector-selected-header">
              <span className="parent-selector-selected-title">
                已选单据
                <span className="parent-selector-selected-count">
                  {selectedRows.length
                    ? `（${selectedRows.length} 条）`
                    : '（0 条）'}
                </span>
              </span>
              <Button
                disabled={!selectedRows.length}
                onClick={clearSelectedRecords}
              >
                清空已选
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
                    <div
                      key={recordId}
                      className="parent-selector-selected-chip"
                    >
                      <div className="parent-selector-selected-chip-main">
                        <div className="parent-selector-selected-chip-top">
                          <span className="parent-selector-selected-chip-title">
                            {summary.primary}
                          </span>
                          {summary.status ? (
                            <StatusTag
                              status={summary.status}
                              statusMap={overlayStatusMap}
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
                            已选单据
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="parent-selector-selected-chip-remove"
                        onClick={() => removeSelectedRecord(recordId)}
                        aria-label={`移除 ${summary.primary}`}
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="parent-selector-selected-empty">
                暂未选择单据，勾选后会固定显示在这里。
              </div>
            )}
          </div>
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
                onChange: (keys, rows) => {
                  const normalizedKeys = keys.map((key) => String(key))
                  setSelectedRowKeys(normalizedKeys)
                  setSelectedRecordMap((prev) => {
                    const next: Record<string, ModuleRecord> = {}
                    normalizedKeys.forEach((normalizedKey) => {
                      const matchedRow = rows.find(
                        (row) => String(row.id) === normalizedKey,
                      )
                      next[normalizedKey] =
                        matchedRow || prev[normalizedKey]
                    })
                    return next
                  })
                },
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
          showTotal: (count) => `共 ${count} 条`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage)
            if (nextPageSize !== pageSize) {
              setPageSize(nextPageSize)
            }
          },
        }}
      />
    </WorkspaceOverlay>
  )
}
