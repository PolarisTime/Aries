import { EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomerOption } from '@/api/master/customer-options'
import { StatusTag } from '@/components/StatusTag'
import { resolveProjectCustomerDisplay } from '@/config/business-pages/master/project-page-utils'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { ProjectInlineDetail } from './ProjectInlineDetail'
import type { ProjectColumnKey } from './project-page-columns'
import {
  buildProjectColumnLabels,
  PROJECT_COLUMN_KEYS as COLUMN_KEYS,
  displayProjectValue as displayValue,
} from './project-page-columns'

type ProjectListRow = LegacyModuleRecord

interface ProjectTableSectionProps {
  records: ProjectListRow[]
  selectedRows: ProjectListRow[]
  customerOptions: CustomerOption[]
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
  onToggleRecordSelected: (record: ProjectListRow) => void
  onRecordDoubleClick: (record: ProjectListRow) => void
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
}

export function ProjectTableSection({
  records,
  selectedRows,
  customerOptions,
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
}: ProjectTableSectionProps) {
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

  const columnLabels = useMemo(() => buildProjectColumnLabels(t), [t])

  const hiddenColumnKeySet = useMemo(
    () => new Set(hiddenColumnKeys),
    [hiddenColumnKeys],
  )

  const columnWidths = useMemo<Record<ProjectColumnKey, number>>(
    () => ({
      projectCode: 140,
      projectName: 200,
      projectNameAbbr: 140,
      customerCode: 180,
      settlementCompanyName: 180,
      projectManager: 140,
      projectAddress: 220,
      status: 100,
      remark: 180,
    }),
    [],
  )

  const dataColumns = useMemo(() => {
    const renderers: Record<ProjectColumnKey, (row: ProjectListRow) => string> =
      {
        projectCode: (row) => displayValue(row.projectCode),
        projectName: (row) => displayValue(row.projectName),
        projectNameAbbr: (row) => displayValue(row.projectNameAbbr),
        customerCode: (row) =>
          resolveProjectCustomerDisplay(row, customerOptions),
        settlementCompanyName: (row) => displayValue(row.settlementCompanyName),
        projectManager: (row) => displayValue(row.projectManager),
        projectAddress: (row) => displayValue(row.projectAddress),
        status: () => '',
        remark: (row) => displayValue(row.remark),
      }
    const columns: ColumnsType<ProjectListRow> = []
    for (const key of COLUMN_KEYS) {
      if (hiddenColumnKeySet.has(key)) {
        continue
      }
      columns.push({
        title: columnLabels[key],
        dataIndex: key,
        key,
        width: columnWidths[key],
        align: key === 'status' ? 'center' : undefined,
        ellipsis: true,
        render:
          key === 'status'
            ? (_: unknown, record: ProjectListRow) => (
                <StatusTag
                  status={asString(record.status)}
                  statusMap={statusMap}
                />
              )
            : (_: unknown, record: ProjectListRow) => renderers[key](record),
      })
    }
    return columns
  }, [columnLabels, columnWidths, customerOptions, hiddenColumnKeySet])

  const visibleColumns: ColumnsType<ProjectListRow> = useMemo(
    () => [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: ProjectListRow) => (
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
      <Table<ProjectListRow>
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
            <ProjectInlineDetail recordId={String(record.id)} />
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
