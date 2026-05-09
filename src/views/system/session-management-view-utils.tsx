import { StopOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { RefreshTokenRecord } from '@/api/session-management'

export function getSessionStatusColor(status: string) {
  if (status === '有效') return 'green'
  if (status === '已禁用') return 'red'
  return 'default'
}

export function getSessionOnlineColor(record: RefreshTokenRecord) {
  if (record.status !== '有效') return 'default'
  return record.online ? 'green' : 'orange'
}

export function getSessionOnlineLabel(record: RefreshTokenRecord) {
  if (record.status !== '有效') return '离线'
  return record.online ? '在线' : '离线'
}

export function truncateSessionDeviceInfo(text: unknown) {
  const normalized = String(text ?? '')
  if (!normalized) return '--'
  return normalized.length > 60 ? `${normalized.slice(0, 60)}...` : normalized
}

interface SessionColumnsOptions {
  canEdit: boolean
  onRevoke: (record: RefreshTokenRecord) => void
}

export function buildSessionTableColumns({
  canEdit,
  onRevoke,
}: SessionColumnsOptions): ColumnsType<RefreshTokenRecord> {
  return [
    {
      title: '操作',
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
            禁用
          </Button>
        ) : null,
    },
    { dataIndex: 'tokenId', title: 'Token ID', width: 200, ellipsis: true },
    { dataIndex: 'loginName', title: '登录名', width: 120 },
    { dataIndex: 'userName', title: '用户名', width: 120 },
    { dataIndex: 'loginIp', title: '登录IP', width: 140 },
    {
      dataIndex: 'deviceInfo',
      title: '设备信息',
      width: 280,
      ellipsis: true,
      render: (value: unknown) => truncateSessionDeviceInfo(value),
    },
    { dataIndex: 'createdAt', title: '创建时间', width: 170 },
    {
      dataIndex: 'lastActiveAt',
      title: '最近活跃',
      width: 170,
      render: (value: string) => value || '--',
    },
    { dataIndex: 'expiresAt', title: '过期时间', width: 170 },
    {
      title: '在线状态',
      key: 'online',
      width: 100,
      align: 'center',
      render: (_: unknown, record) => (
        <Tag color={getSessionOnlineColor(record)}>
          {getSessionOnlineLabel(record)}
        </Tag>
      ),
    },
    {
      dataIndex: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (value: string) => (
        <Tag color={getSessionStatusColor(value)}>{value}</Tag>
      ),
    },
  ]
}
