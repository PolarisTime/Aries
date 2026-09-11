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
import { MasterInlineDetail } from './MasterInlineDetail'
import type { MasterDataPageSpec } from './master-data-types'
import { formatMasterValue } from './master-data-utils'

interface Props {
  spec: MasterDataPageSpec
  records: LegacyModuleRecord[]
  selectedRows: LegacyModuleRecord[]
  total: number
  page: number
  pageSize: number
  hiddenColumnKeySet: Set<string>
  selectedRowKeys: string[]
  expandedRowKeys: string[]
  isLoading: boolean
  isFetching: boolean
  hasListError: boolean
  errorMessage: string
  onSelectionChange: (keys: string[]) => void
  onExpandedRowKeysChange: (updater: (previous: string[]) => string[]) => void
  onToggleRecordSelected: (record: LegacyModuleRecord) => void
  onRecordDoubleClick: (record: LegacyModuleRecord) => void
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
}

function buildOverview(
  spec: MasterDataPageSpec,
  rows: LegacyModuleRecord[],
  selected: LegacyModuleRecord[],
  t: (key: string) => string,
) {
  if (spec.overview) {
    return spec.overview(rows, selected)
  }
  const target = selected.length ? selected : rows
  return [
    {
      label: t('modules.overview.masterDataCount'),
      value: String(target.length),
    },
    {
      label: t('modules.overview.normalCount'),
      value: String(
        target.filter((row) => asString(row.status) === '正常').length,
      ),
    },
  ]
}

export function MasterDataTable({
  spec,
  records,
  selectedRows,
  total,
  page,
  pageSize,
  hiddenColumnKeySet,
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
}: Props) {
  const { t } = useTranslation()

  const visibleColumns: ColumnsType<LegacyModuleRecord> = useMemo(() => {
    const dataColumns: ColumnsType<LegacyModuleRecord> = spec.columns.flatMap(
      (column) => {
        if (hiddenColumnKeySet.has(column.key)) {
          return []
        }
        return [
          {
            title: column.title,
            dataIndex: column.key,
            key: column.key,
            width: column.width,
            align: column.align,
            ellipsis: true,
            render: (_: unknown, record: LegacyModuleRecord) =>
              column.status ? (
                <StatusTag
                  status={asString(record[column.key])}
                  statusMap={statusMap}
                />
              ) : column.render ? (
                column.render(record)
              ) : (
                formatMasterValue(record[column.key])
              ),
          },
        ]
      },
    )
    return [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: LegacyModuleRecord) => (
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
    ]
  }, [spec.columns, hiddenColumnKeySet, t, onExpandedRowKeysChange])

  const overviewItems = useMemo(
    () => buildOverview(spec, records, selectedRows, t),
    [spec, records, selectedRows, t],
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
      <Table<LegacyModuleRecord>
        rowKey={(record) => String(record.id)}
        columns={visibleColumns}
        dataSource={records}
        loading={isLoading || isFetching}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          onChange: (keys: Key[]) => onSelectionChange(keys.map(String)),
        }}
        rowClassName={(record) =>
          (spec.rowHighlightStatuses ?? []).includes(asString(record.status))
            ? 'table-row-emphasis'
            : ''
        }
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          expandedRowRender: (record) => (
            <MasterInlineDetail spec={spec} recordId={String(record.id)} />
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
