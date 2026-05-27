import { StopOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import type { ColumnsType } from 'antd/es/table'
import Tag from 'antd/es/tag'
import type { TFunction } from 'i18next'
import type { RefreshTokenRecord } from '@/api/session-management'
import { asString } from '@/utils/type-narrowing'

function getSessionStatusColor(status: string) {
  if (status === '有效') return 'green'
  if (status === '已禁用') return 'red'
  return 'default'
}

function getSessionOnlineColor(record: RefreshTokenRecord) {
  if (record.status !== '有效') return 'default'
  return record.online ? 'green' : 'orange'
}

function getSessionOnlineLabel(
  record: RefreshTokenRecord,
  t: TFunction,
) {
  if (record.status !== '有效') return t('system.session.offline')
  return record.online
    ? t('system.session.online')
    : t('system.session.offline')
}

function truncateSessionDeviceInfo(text: unknown) {
  const normalized = asString(text)
  if (!normalized) return '--'
  return normalized.length > 60 ? `${normalized.slice(0, 60)}...` : normalized
}

interface SessionColumnsOptions {
  canEdit: boolean
  onRevoke: (record: RefreshTokenRecord) => void
  t: TFunction
}

export function buildSessionTableColumns({
  canEdit,
  onRevoke,
  t,
}: SessionColumnsOptions): ColumnsType<RefreshTokenRecord> {
  return [
    {
      title: t('common.operation'),
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record) =>
        canEdit && record.status === '有效' ? (
          <Button
            type="link"
            size="small"
            danger
            icon={<StopOutlined />}
            onClick={() => onRevoke(record)}
          >
            {t('system.session.disable')}
          </Button>
        ) : null,
    },
    { dataIndex: 'tokenId', title: 'Token ID', width: 200, ellipsis: true },
    {
      dataIndex: 'loginName',
      title: t('system.userAccount.loginName'),
      width: 120,
    },
    {
      dataIndex: 'userName',
      title: t('system.userAccount.userName'),
      width: 120,
    },
    {
      dataIndex: 'loginIp',
      title: t('system.session.loginIp'),
      width: 140,
    },
    {
      dataIndex: 'deviceInfo',
      title: t('system.session.deviceInfo'),
      width: 280,
      ellipsis: true,
      render: (value: unknown) => truncateSessionDeviceInfo(value),
    },
    {
      dataIndex: 'createdAt',
      title: t('common.createdAt'),
      width: 170,
    },
    {
      dataIndex: 'lastActiveAt',
      title: t('system.session.lastActive'),
      width: 170,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'expiresAt',
      title: t('system.session.expiresAt'),
      width: 170,
    },
    {
      title: t('system.session.onlineStatus'),
      key: 'online',
      width: 100,
      align: 'center',
      render: (_: unknown, record) => (
        <Tag color={getSessionOnlineColor(record)}>
          {getSessionOnlineLabel(record, t)}
        </Tag>
      ),
    },
    {
      dataIndex: 'status',
      title: t('common.status'),
      width: 100,
      align: 'center',
      render: (value: string) => (
        <Tag color={getSessionStatusColor(value)}>{value}</Tag>
      ),
    },
  ]
}
