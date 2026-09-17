import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Table } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import type { Key } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SalesContractResponse } from '@/api/sales/sales-contracts'
import { StatusTag } from '@/components/StatusTag'
import { SALES_CONTRACT_QUOTA_STATUSES } from '@/shared/schemas/sales-contract'
import type { ModuleStatusMeta } from '@/types/module-page'
import { formatAmount, formatDate, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import { SALES_CONTRACT_STATUS } from './sales-contract-model'

interface SalesContractTableProps {
  records: SalesContractResponse[]
  selectedRows: SalesContractResponse[]
  total: number
  page: number
  pageSize: number
  selectedRowKeys: string[]
  isLoading: boolean
  isFetching: boolean
  hasListError: boolean
  errorMessage: string
  onSelectionChange: (keys: Key[]) => void
  onToggleRecordSelected: (record: SalesContractResponse) => void
  onRecordDoubleClick: (record: SalesContractResponse) => void
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
}

export function SalesContractTable({
  records,
  selectedRows,
  total,
  page,
  pageSize,
  selectedRowKeys,
  isLoading,
  isFetching,
  hasListError,
  errorMessage,
  onSelectionChange,
  onToggleRecordSelected,
  onRecordDoubleClick,
  onPageChange,
  onRetry,
}: SalesContractTableProps) {
  const { t } = useTranslation()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()

  const statusMap = useMemo<Record<string, ModuleStatusMeta>>(
    () => ({
      [SALES_CONTRACT_STATUS.DRAFT]: {
        text: t('modules.status.draft'),
        color: 'warning',
      },
      [SALES_CONTRACT_STATUS.REVIEWED]: {
        text: t('modules.status.reviewed'),
        color: 'processing',
      },
      [SALES_CONTRACT_STATUS.ISSUED]: {
        text: t('modules.status.issued'),
        color: 'cyan',
      },
      [SALES_CONTRACT_STATUS.ARCHIVED]: {
        text: t('modules.status.archived'),
        color: 'success',
      },
      [SALES_CONTRACT_STATUS.VOIDED]: {
        text: t('modules.status.voided'),
        color: 'error',
      },
    }),
    [t],
  )

  const overviewItems = useMemo(() => {
    const rows = selectedRows.length ? selectedRows : records
    return [
      {
        label: t('modules.overview.recordCount'),
        value: String(rows.length),
      },
      {
        label: t('modules.salesContract.effectiveCount'),
        value: String(
          rows.filter((row) =>
            SALES_CONTRACT_QUOTA_STATUSES.includes(row.status),
          ).length,
        ),
      },
    ]
  }, [records, selectedRows, t])

  const columns = useMemo<ColumnsType<SalesContractResponse>>(() => {
    const numericSorter =
      (
        key: 'totalAmount' | 'totalTonnage',
      ): ColumnType<SalesContractResponse>['sorter'] =>
      (left, right) =>
        Number(left[key]) - Number(right[key])
    return [
      {
        title: t('modules.salesContract.contractNo'),
        dataIndex: 'contractNo',
        key: 'contractNo',
        width: 180,
        ellipsis: true,
        sorter: (left, right) =>
          asString(left.contractNo).localeCompare(asString(right.contractNo)),
      },
      {
        title: t('modules.salesContract.name'),
        dataIndex: 'name',
        key: 'name',
        width: 200,
        ellipsis: true,
      },
      {
        title: t('modules.pages.project.customer'),
        dataIndex: 'customerName',
        key: 'customerName',
        width: 160,
        ellipsis: true,
        render: (_: unknown, row) => asString(row.customerName) || '--',
      },
      {
        title: t('modules.pages.project.projectName'),
        dataIndex: 'projectName',
        key: 'projectName',
        width: 180,
        ellipsis: true,
        render: (_: unknown, row) => asString(row.projectName) || '--',
      },
      {
        title: t('modules.salesContract.startDate'),
        dataIndex: 'startDate',
        key: 'startDate',
        width: 130,
        sorter: (left, right) =>
          asString(left.startDate).localeCompare(asString(right.startDate)),
        render: (_: unknown, row) => formatDate(row.startDate),
      },
      {
        title: t('modules.salesContract.endDate'),
        dataIndex: 'endDate',
        key: 'endDate',
        width: 130,
        render: (_: unknown, row) => formatDate(row.endDate),
      },
      {
        title: t('modules.columns.totalAmount'),
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 140,
        align: 'right',
        sorter: numericSorter('totalAmount'),
        render: (_: unknown, row) => formatAmount(row.totalAmount),
      },
      {
        title: t('modules.salesContract.totalTonnage'),
        dataIndex: 'totalTonnage',
        key: 'totalTonnage',
        width: 140,
        align: 'right',
        sorter: numericSorter('totalTonnage'),
        render: (_: unknown, row) => formatWeight(row.totalTonnage),
      },
      {
        title: t('modules.columns.status'),
        dataIndex: 'status',
        key: 'status',
        width: 110,
        align: 'center',
        render: (_: unknown, row) => (
          <StatusTag status={asString(row.status)} statusMap={statusMap} />
        ),
      },
      {
        title: t('modules.columns.remark'),
        dataIndex: 'remark',
        key: 'remark',
        width: 180,
        ellipsis: true,
        render: (_: unknown, row) =>
          asString(row.remark) ? asString(row.remark) : '--',
      },
    ]
  }, [statusMap, t])

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
      <div ref={shellRef} className="module-table-shell" style={shellStyle}>
        <Table<SalesContractResponse>
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={records}
          loading={isLoading || isFetching}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            preserveSelectedRowKeys: true,
            onChange: onSelectionChange,
          }}
          rowClassName={(record) =>
            record.status === SALES_CONTRACT_STATUS.VOIDED
              ? 'table-row-emphasis'
              : ''
          }
          onRow={(record) => ({
            onClick: () => onToggleRecordSelected(record),
            onDoubleClick: () => onRecordDoubleClick(record),
          })}
          scroll={{ x: 'max-content', y: scrollY }}
        />
      </div>
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
