import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ValueAliasRecord } from '@/api/master/value-aliases'
import { TableActions } from '@/components/TableActions'
import { formatDateTime } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import { formatValueAliasDimension } from './value-alias-form-model'

const DIMENSION_TAG_COLORS: Record<string, string> = {
  CATEGORY: 'blue',
  MATERIAL: 'green',
  LENGTH: 'orange',
  BRAND: 'purple',
}

interface Props {
  records: ValueAliasRecord[]
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
  onEdit: (record: ValueAliasRecord) => void
  onDelete: (record: ValueAliasRecord) => void
}

export function ValueAliasTable({
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

  const columns = useMemo<ColumnsType<ValueAliasRecord>>(
    () => [
      {
        title: t('valueAlias.dimension'),
        dataIndex: 'dimension',
        key: 'dimension',
        width: 120,
        render: (_value, record) => (
          <Tag color={DIMENSION_TAG_COLORS[record.dimension] ?? 'default'}>
            {formatValueAliasDimension(t, record.dimension)}
          </Tag>
        ),
      },
      {
        title: t('valueAlias.sourceValue'),
        dataIndex: 'sourceValue',
        key: 'sourceValue',
        width: 220,
        ellipsis: true,
      },
      {
        title: t('valueAlias.targetValue'),
        dataIndex: 'targetValue',
        key: 'targetValue',
        width: 220,
        ellipsis: true,
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
                confirm: t('valueAlias.deleteConfirm', {
                  source: record.sourceValue,
                  target: record.targetValue,
                }),
                onClick: () => onDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [deletingId, onDelete, onEdit, t],
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
        title={errorMessage || t('valueAlias.loadFailed')}
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
        <Table<ValueAliasRecord>
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={records}
          loading={isLoading || isFetching}
          pagination={false}
          locale={{ emptyText: t('valueAlias.empty') }}
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
