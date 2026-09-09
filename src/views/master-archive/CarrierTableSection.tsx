import { EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { CarrierInlineDetail } from './CarrierInlineDetail'
import type { CarrierColumnKey } from './carrier-page-columns'
import {
  buildCarrierColumnLabels,
  CARRIER_COLUMN_KEYS as COLUMN_KEYS,
  displayCarrierValue as displayValue,
} from './carrier-page-columns'

type CarrierListRow = LegacyModuleRecord

interface CarrierTableSectionProps {
  records: CarrierListRow[]
  selectedRows: CarrierListRow[]
  total: number
  page: number
  pageSize: number
  hiddenColumnKeys: string[]
  selectedRowKeys: string[]
  expandedRowKeys: string[]
  isLoading: boolean
  isFetching: boolean
  hasListError: boolean
  errorMessage: string
  onSelectionChange: (keys: Key[]) => void
  onExpandedRowKeysChange: (updater: (previous: string[]) => string[]) => void
  onToggleRecordSelected: (record: CarrierListRow) => void
  onRecordDoubleClick: (record: CarrierListRow) => void
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
}

export function CarrierTableSection({
  records,
  selectedRows,
  total,
  page,
  pageSize,
  hiddenColumnKeys,
  selectedRowKeys,
  expandedRowKeys,
  isLoading,
  isFetching,
  hasListError,
  errorMessage,
  onSelectionChange,
  onExpandedRowKeysChange,
  onToggleRecordSelected,
  onRecordDoubleClick,
  onPageChange,
  onRetry,
}: CarrierTableSectionProps) {
  const { t } = useTranslation()

  const overviewItems = useMemo(() => {
    const rows = selectedRows.length ? selectedRows : records
    return [
      {
        label: t('modules.overview.masterDataCount'),
        value: String(rows.length),
      },
      {
        label: t('modules.overview.normalCount'),
        value: String(
          rows.filter((row) => asString(row.status) === '正常').length,
        ),
      },
    ]
  }, [records, selectedRows, t])

  const columnLabels = useMemo(() => buildCarrierColumnLabels(t), [t])

  const hiddenColumnKeySet = useMemo(
    () => new Set(hiddenColumnKeys),
    [hiddenColumnKeys],
  )

  const columnWidths = useMemo<Record<CarrierColumnKey, number>>(
    () => ({
      carrierCode: 140,
      carrierName: 180,
      contactName: 110,
      contactPhone: 140,
      vehicleType: 120,
      priceMode: 100,
      defaultSettlementCompanyName: 180,
      status: 100,
      remark: 180,
    }),
    [],
  )

  const dataColumns = useMemo(() => {
    const columns: ColumnsType<CarrierListRow> = []
    for (const key of COLUMN_KEYS) {
      if (hiddenColumnKeySet.has(key)) {
        continue
      }
      columns.push({
        title: columnLabels[key],
        dataIndex: key,
        key,
        width: columnWidths[key],
        align: key === 'status' || key === 'priceMode' ? 'center' : undefined,
        ellipsis: true,
        render:
          key === 'status'
            ? (_: unknown, record: CarrierListRow) => (
                <StatusTag
                  status={asString(record.status)}
                  statusMap={statusMap}
                />
              )
            : (_: unknown, record: CarrierListRow) => displayValue(record[key]),
      })
    }
    return columns
  }, [columnLabels, columnWidths, hiddenColumnKeySet])

  const visibleColumns: ColumnsType<CarrierListRow> = useMemo(
    () => [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: CarrierListRow) => (
          <Tooltip title={t('hooks.gridColumns.detail')}>
            <Button
              aria-label={t('hooks.gridColumns.detail')}
              className="table-detail-toggle-btn"
              icon={<EyeOutlined />}
              size="small"
              type="text"
              onClick={(event) => {
                event.stopPropagation()
                const recordKey = String(record.id)
                onExpandedRowKeysChange((previous) =>
                  previous.includes(recordKey)
                    ? previous.filter((key) => key !== recordKey)
                    : [...previous, recordKey],
                )
              }}
            />
          </Tooltip>
        ),
      },
      ...dataColumns,
    ],
    [dataColumns, onExpandedRowKeysChange, t],
  )

  if (hasListError) {
    return (
      <Alert
        type="error"
        showIcon
        title={errorMessage || t('api.loadFailed')}
        className="module-grid-warning"
        action={
          <Button
            size="small"
            type="primary"
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={onRetry}
          >
            {t('errorBoundary.retry')}
          </Button>
        }
      />
    )
  }

  return (
    <>
      <Table<CarrierListRow>
        rowKey={(record) => String(record.id)}
        columns={visibleColumns}
        dataSource={records}
        loading={isLoading || isFetching}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          onChange: onSelectionChange,
        }}
        rowClassName={(record) =>
          asString(record.status) === '禁用' ? 'table-row-emphasis' : ''
        }
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          expandedRowRender: (record) => (
            <CarrierInlineDetail recordId={String(record.id)} />
          ),
          onExpand: (expanded, record) => {
            const recordKey = String(record.id)
            onExpandedRowKeysChange((previous) =>
              expanded
                ? [...previous, recordKey]
                : previous.filter((key) => key !== recordKey),
            )
          },
        }}
        onRow={(record) => ({
          onClick: () => onToggleRecordSelected(record),
          onDoubleClick: () => onRecordDoubleClick(record),
        })}
        scroll={{ x: 'max-content' }}
      />
      <ModuleTablePagination
        total={total}
        currentPage={page}
        pageSize={pageSize}
        currentItemCount={records.length}
        overviewItems={overviewItems}
        onPageChange={onPageChange}
      />
    </>
  )
}
