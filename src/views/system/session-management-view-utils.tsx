import { StopOutlined } from '@ant-design/icons'
import type { ProColumns } from '@ant-design/pro-components/es/table'
import { Tooltip, Typography } from 'antd'
import type { TFunction } from 'i18next'
import type { RefreshTokenRecord } from '@/api/session-management'
import { StatusTag } from '@/components/StatusTag'
import { TableActions } from '@/components/TableActions'
import { SESSION_STATUS } from '@/constants/status-constants'
import { formatDateTime } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

type SessionStatus = 'valid' | 'disabled' | 'unknown'

function normalizeSessionStatus(status: unknown): SessionStatus {
  const normalized = asString(status).trim().toLowerCase()
  if ([SESSION_STATUS.VALID, 'valid', 'active'].includes(normalized))
    return 'valid'
  if (
    [
      SESSION_STATUS.DISABLED,
      'disabled',
      'revoked',
      'inactive',
      'invalid',
    ].includes(normalized)
  )
    return 'disabled'
  return 'unknown'
}

function isSessionValidStatus(status: unknown) {
  return normalizeSessionStatus(status) === 'valid'
}

function getSessionStatusColor(status: unknown) {
  const normalizedStatus = normalizeSessionStatus(status)
  if (normalizedStatus === 'valid') return 'green'
  if (normalizedStatus === 'disabled') return 'red'
  return 'default'
}

function getSessionOnlineColor(record: RefreshTokenRecord) {
  if (!isSessionValidStatus(record.status)) return 'default'
  return record.online ? 'green' : 'orange'
}

function getSessionStatusLabel(status: unknown, t: TFunction) {
  const normalizedStatus = normalizeSessionStatus(status)
  if (normalizedStatus === 'valid') return t('system.session.valid')
  if (normalizedStatus === 'disabled') return t('system.session.disabled')
  return asString(status) || '--'
}

function getSessionOnlineLabel(record: RefreshTokenRecord, t: TFunction) {
  if (!isSessionValidStatus(record.status)) return t('system.session.offline')
  return record.online
    ? t('system.session.online')
    : t('system.session.offline')
}

function truncateMiddle(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  const edgeLength = Math.max(4, Math.floor((maxLength - 3) / 2))
  return `${text.slice(0, edgeLength)}...${text.slice(-edgeLength)}`
}

function renderCompactCopyText(value: unknown, maxLength: number) {
  const normalized = asString(value)
  if (!normalized) return '--'
  return (
    <Tooltip title={normalized}>
      <Typography.Text copyable={{ text: normalized }}>
        {truncateMiddle(normalized, maxLength)}
      </Typography.Text>
    </Tooltip>
  )
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
}: SessionColumnsOptions): ProColumns<RefreshTokenRecord>[] {
  return [
    {
      title: t('common.operation'),
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record) =>
        canEdit && isSessionValidStatus(record.status) ? (
          <TableActions
            items={[
              {
                key: 'disable',
                label: t('system.session.disable'),
                icon: <StopOutlined />,
                danger: true,
                onClick: () => onRevoke(record),
              },
            ]}
          />
        ) : null,
    },
    {
      dataIndex: 'tokenId',
      title: t('system.session.tokenId'),
      width: 180,
      ellipsis: true,
      render: (_dom, record) => renderCompactCopyText(record.tokenId, 22),
    },
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
      width: 240,
      ellipsis: true,
      render: (_dom, record) => renderCompactCopyText(record.deviceInfo, 42),
    },
    {
      dataIndex: 'createdAt',
      title: t('common.createdAt'),
      width: 170,
      render: (_dom, record) => formatDateTime(record.createdAt, '--'),
    },
    {
      dataIndex: 'lastActiveAt',
      title: t('system.session.lastActive'),
      width: 170,
      render: (_dom, record) => formatDateTime(record.lastActiveAt, '--'),
    },
    {
      dataIndex: 'expiresAt',
      title: t('system.session.expiresAt'),
      width: 170,
      render: (_dom, record) => formatDateTime(record.expiresAt, '--'),
    },
    {
      title: t('system.session.onlineStatus'),
      key: 'online',
      width: 100,
      align: 'center',
      render: (_: unknown, record) => (
        <StatusTag
          status={record.online ? 'online' : 'offline'}
          statusMap={{
            online: {
              color: getSessionOnlineColor(record),
              label: getSessionOnlineLabel(record, t),
            },
            offline: {
              color: getSessionOnlineColor(record),
              label: getSessionOnlineLabel(record, t),
            },
          }}
        />
      ),
    },
    {
      dataIndex: 'status',
      title: t('common.status'),
      width: 100,
      align: 'center',
      render: (_dom, record) => (
        <StatusTag
          status={asString(record.status) || 'unknown'}
          statusMap={{
            [asString(record.status) || 'unknown']: {
              color: getSessionStatusColor(record.status),
              label: getSessionStatusLabel(record.status, t),
            },
          }}
        />
      ),
    },
  ]
}
