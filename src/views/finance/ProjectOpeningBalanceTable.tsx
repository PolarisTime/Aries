import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOpeningBalanceRecord } from '@/api/finance/project-opening-balances'
import { formatAmount, formatDate, formatDateTime } from '@/utils/formatters'
import { renderProjectNameCell } from '@/utils/project-display'
import {
  canUnlockOpeningBalance,
  isDraftOpeningBalance,
  type ProjectOpeningBalanceCapabilities,
} from './project-opening-balance-model'

interface Props {
  records: ProjectOpeningBalanceRecord[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  hasError: boolean
  errorMessage: string
  mutatingId: string | null
  capabilities: ProjectOpeningBalanceCapabilities
  onPageChange: (page: number, pageSize: number) => void
  onRetry: () => void
  onEdit: (record: ProjectOpeningBalanceRecord) => void
  onConfirm: (record: ProjectOpeningBalanceRecord) => void
  onUnlock: (record: ProjectOpeningBalanceRecord) => void
  onDelete: (record: ProjectOpeningBalanceRecord) => void
}

export function ProjectOpeningBalanceTable({
  records,
  total,
  page,
  pageSize,
  loading,
  hasError,
  errorMessage,
  mutatingId,
  capabilities,
  onPageChange,
  onRetry,
  onEdit,
  onConfirm,
  onUnlock,
  onDelete,
}: Props) {
  const { t } = useTranslation()

  const columns = useMemo<ColumnsType<ProjectOpeningBalanceRecord>>(
    () => [
      {
        title: t('openingBalance.balanceNo'),
        dataIndex: 'balanceNo',
        width: 170,
        fixed: 'start',
      },
      {
        title: t('openingBalance.project'),
        dataIndex: 'projectName',
        width: 220,
        render: (value, record) => renderProjectNameCell(value, record),
      },
      {
        title: t('openingBalance.customer'),
        dataIndex: 'customerName',
        width: 160,
      },
      {
        title: t('openingBalance.settlementCompany'),
        dataIndex: 'settlementCompanyName',
        width: 160,
      },
      {
        title: t('openingBalance.balanceType'),
        dataIndex: 'balanceType',
        width: 105,
        align: 'center',
        render: (value: ProjectOpeningBalanceRecord['balanceType']) =>
          value === 'RECEIVABLE' ? (
            <Tag color="volcano">{t('openingBalance.typeReceivable')}</Tag>
          ) : (
            <Tag color="cyan">{t('openingBalance.typeAdvance')}</Tag>
          ),
      },
      {
        title: t('openingBalance.cutoffDate'),
        dataIndex: 'cutoffDate',
        width: 115,
        render: (value: string) => formatDate(value),
      },
      {
        title: t('openingBalance.openingAmount'),
        dataIndex: 'openingAmount',
        width: 125,
        align: 'right',
        render: (value: number) => `¥${formatAmount(value)}`,
      },
      {
        title: t('openingBalance.settledAmount'),
        dataIndex: 'settledAmount',
        width: 125,
        align: 'right',
        render: (value: number, record) =>
          record.balanceType === 'RECEIVABLE' ? `¥${formatAmount(value)}` : '-',
      },
      {
        title: t('openingBalance.remainingAmount'),
        dataIndex: 'remainingAmount',
        width: 125,
        align: 'right',
        render: (value: number, record) =>
          record.balanceType === 'RECEIVABLE' ? (
            <Typography.Text strong={value > 0}>
              ¥{formatAmount(value)}
            </Typography.Text>
          ) : (
            '-'
          ),
      },
      {
        title: t('modules.columns.status'),
        dataIndex: 'status',
        width: 115,
        align: 'center',
        render: (value: ProjectOpeningBalanceRecord['status']) =>
          value === 'CONFIRMED' ? (
            <Tag color="green" icon={<LockOutlined />}>
              {t('openingBalance.statusConfirmed')}
            </Tag>
          ) : (
            <Tag>{t('openingBalance.statusDraft')}</Tag>
          ),
      },
      {
        title: t('openingBalance.legacyDocNo'),
        dataIndex: 'legacyDocNo',
        width: 140,
        render: (value: string | null) => value || '-',
      },
      {
        title: t('openingBalance.confirmedInfo'),
        dataIndex: 'confirmedAt',
        width: 170,
        render: (value: string | null, record) =>
          value
            ? `${record.confirmedByName || '-'} · ${formatDateTime(value)}`
            : '-',
      },
      {
        title: t('modules.columns.remark'),
        dataIndex: 'remark',
        width: 180,
        ellipsis: true,
        render: (value: string | null) => value || '-',
      },
      {
        title: t('common.actions'),
        key: 'actions',
        width: 210,
        fixed: 'end',
        render: (_value, record) => {
          const busy = mutatingId === record.id
          if (isDraftOpeningBalance(record.status)) {
            return (
              <Space size={4}>
                {capabilities.canUpdate ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    disabled={busy}
                    onClick={() => onEdit(record)}
                  >
                    {t('common.edit')}
                  </Button>
                ) : null}
                {capabilities.canConfirm ? (
                  <Popconfirm
                    title={t('openingBalance.confirmTitle')}
                    description={t('openingBalance.confirmDescription')}
                    okText={t('openingBalance.confirmAction')}
                    cancelText={t('common.cancel')}
                    onConfirm={() => onConfirm(record)}
                  >
                    <Button
                      type="link"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      loading={busy}
                    >
                      {t('openingBalance.confirmAction')}
                    </Button>
                  </Popconfirm>
                ) : null}
                {capabilities.canDelete ? (
                  <Popconfirm
                    title={t('openingBalance.deleteTitle')}
                    description={t('openingBalance.deleteDescription')}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDelete(record)}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={busy}
                    >
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            )
          }

          const unlockable = canUnlockOpeningBalance(record)
          if (!capabilities.canConfirm) {
            return (
              <Typography.Text type="secondary">
                {t('openingBalance.lockedReadonly')}
              </Typography.Text>
            )
          }
          if (!unlockable) {
            return (
              <Tooltip title={t('openingBalance.unlockBlockedByReceipt')}>
                <Button
                  type="link"
                  size="small"
                  icon={<UnlockOutlined />}
                  disabled
                >
                  {t('openingBalance.unlockAction')}
                </Button>
              </Tooltip>
            )
          }
          return (
            <Popconfirm
              title={t('openingBalance.unlockTitle')}
              description={t('openingBalance.unlockDescription')}
              okText={t('openingBalance.unlockAction')}
              cancelText={t('common.cancel')}
              onConfirm={() => onUnlock(record)}
            >
              <Button
                type="link"
                size="small"
                icon={<UnlockOutlined />}
                loading={busy}
              >
                {t('openingBalance.unlockAction')}
              </Button>
            </Popconfirm>
          )
        },
      },
    ],
    [
      capabilities.canConfirm,
      capabilities.canDelete,
      capabilities.canUpdate,
      mutatingId,
      onConfirm,
      onDelete,
      onEdit,
      onUnlock,
      t,
    ],
  )

  if (hasError) {
    return (
      <Alert
        type="error"
        showIcon
        title={t('openingBalance.loadFailed')}
        description={errorMessage}
        action={<Button onClick={onRetry}>{t('common.retry')}</Button>}
      />
    )
  }

  return (
    <Table<ProjectOpeningBalanceRecord>
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      scroll={{ x: 1860 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => t('common.total', { count }),
        onChange: onPageChange,
      }}
    />
  )
}
