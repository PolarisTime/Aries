import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LengthPremiumRecord } from '@/api/master/length-premiums'
import { StatusTag } from '@/components/StatusTag'
import { TableActions } from '@/components/TableActions'
import { formatDateTime } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import {
  buildLengthPremiumStatusMap,
  formatPremium,
} from './length-premium-form-model'

interface Props {
  records: LengthPremiumRecord[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  isFetching: boolean
  hasError: boolean
  errorMessage: string
  /** 正在删除的记录 ID：行内按钮显示 loading，避免重复点击。 */
  deletingId: string | null
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
  onEdit: (record: LengthPremiumRecord) => void
  onDelete: (record: LengthPremiumRecord) => void
}

export function LengthPremiumTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  isFetching,
  hasError,
  errorMessage,
  deletingId,
  onPageChange,
  onRetry,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()

  const statusMap = useMemo(() => buildLengthPremiumStatusMap(t), [t])

  const columns = useMemo<ColumnsType<LengthPremiumRecord>>(
    () => [
      {
        title: t('lengthPremium.lengthName'),
        dataIndex: 'lengthName',
        key: 'lengthName',
        width: 180,
        ellipsis: true,
      },
      {
        title: t('lengthPremium.premium'),
        dataIndex: 'premium',
        key: 'premium',
        width: 150,
        // 正负号由 formatPremium 统一给出：列、测试共用一个口径，不在渲染处另写算式。
        render: (_value, record) => formatPremium(record.premium),
      },
      {
        title: t('lengthPremium.sortOrder'),
        dataIndex: 'sortOrder',
        key: 'sortOrder',
        width: 100,
      },
      {
        title: t('lengthPremium.status'),
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (_value, record) => (
          <StatusTag status={record.status} statusMap={statusMap} />
        ),
      },
      {
        title: t('common.remark'),
        dataIndex: 'remark',
        key: 'remark',
        ellipsis: true,
        render: (_value, record) => asString(record.remark).trim() || '—',
      },
      {
        title: t('common.updatedAt'),
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        render: (_value, record) =>
          formatDateTime(record.updatedAt ?? record.createdAt),
      },
      {
        title: t('common.operation'),
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_value, record) => (
          <TableActions
            items={[
              {
                key: 'edit',
                label: t('common.edit'),
                onClick: () => onEdit(record),
              },
              {
                key: 'delete',
                label: t('common.delete'),
                danger: true,
                disabled: deletingId === record.id,
                confirm: t('lengthPremium.deleteConfirm', {
                  name: record.lengthName,
                }),
                onClick: () => onDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [deletingId, onDelete, onEdit, statusMap, t],
  )

  const overviewItems = useMemo(
    () => [
      {
        label: t('modules.overview.recordCount'),
        value: String(total),
      },
    ],
    [t, total],
  )

  if (hasError) {
    return (
      <Alert
        type="error"
        showIcon
        title={errorMessage || t('lengthPremium.loadFailed')}
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
        <Table<LengthPremiumRecord>
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={records}
          loading={isLoading || isFetching}
          pagination={false}
          locale={{ emptyText: t('lengthPremium.empty') }}
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
