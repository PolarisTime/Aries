import { EyeOutlined, StopOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import type {
  ApiKeyActionOption,
  ApiKeyRecord,
  ApiKeyResourceOption,
} from '@/api/api-keys'
import {
  getApiKeyAllowedActionText,
  getApiKeyAllowedResourceText,
  getApiKeyStatusColor,
} from '@/views/system/api-key-view-utils'

interface Options {
  canEdit: boolean
  actionOptions: ApiKeyActionOption[]
  resourceOptions: ApiKeyResourceOption[]
  onView: (record: ApiKeyRecord) => void
  onRevoke: (record: ApiKeyRecord) => void
}

export function buildApiKeyListColumns({
  canEdit,
  actionOptions,
  resourceOptions,
  onView,
  onRevoke,
}: Options): TableColumnsType<ApiKeyRecord> {
  return [
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            查看
          </Button>
          {canEdit && record.status === '有效' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => onRevoke(record)}
            >
              禁用
            </Button>
          )}
        </Space>
      ),
    },
    { dataIndex: 'keyName', title: '密钥名称', width: 180 },
    { dataIndex: 'usageScope', title: '使用范围', width: 130 },
    {
      dataIndex: 'allowedResources',
      title: '允许资源',
      width: 240,
      ellipsis: true,
      render: (value: string[]) =>
        getApiKeyAllowedResourceText(value, resourceOptions),
    },
    {
      dataIndex: 'allowedActions',
      title: '允许动作',
      width: 180,
      ellipsis: true,
      render: (value: string[]) =>
        getApiKeyAllowedActionText(value, actionOptions),
    },
    {
      title: '所属用户',
      dataIndex: 'userName',
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.userName || record.loginName}</strong>
          </div>
          {record.userName && (
            <div className="text-xs text-secondary">
              {record.loginName}
            </div>
          )}
        </div>
      ),
    },
    { dataIndex: 'keyPrefix', title: '前缀', width: 110 },
    { dataIndex: 'createdAt', title: '创建时间', width: 180 },
    {
      dataIndex: 'expiresAt',
      title: '过期时间',
      width: 180,
      render: (value: string) => value || '永不过期',
    },
    {
      dataIndex: 'lastUsedAt',
      title: '最后使用',
      width: 180,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'status',
      title: '状态',
      width: 110,
      align: 'center',
      render: (value: string) => (
        <Tag color={getApiKeyStatusColor(value)}>{value}</Tag>
      ),
    },
  ]
}
