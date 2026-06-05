import { EyeOutlined, StopOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import i18next from 'i18next'
import type {
  ApiKeyActionOption,
  ApiKeyRecord,
  ApiKeyResourceOption,
} from '@/api/api-keys'
import { formatDateTime } from '@/utils/formatters'
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
      title: i18next.t('system.apiKeyColumns.colOperation'),
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
            {i18next.t('system.apiKeyColumns.view')}
          </Button>
          {canEdit && record.status === '有效' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => onRevoke(record)}
            >
              {i18next.t('system.apiKeyColumns.disable')}
            </Button>
          )}
        </Space>
      ),
    },
    {
      dataIndex: 'keyName',
      title: i18next.t('system.apiKeyColumns.colKeyName'),
      width: 180,
    },
    {
      dataIndex: 'usageScope',
      title: i18next.t('system.apiKeyColumns.colUsageScope'),
      width: 130,
    },
    {
      dataIndex: 'allowedResources',
      title: i18next.t('system.apiKeyColumns.colAllowedResources'),
      width: 240,
      ellipsis: true,
      render: (value: string[]) =>
        getApiKeyAllowedResourceText(value, resourceOptions),
    },
    {
      dataIndex: 'allowedActions',
      title: i18next.t('system.apiKeyColumns.colAllowedActions'),
      width: 180,
      ellipsis: true,
      render: (value: string[]) =>
        getApiKeyAllowedActionText(value, actionOptions),
    },
    {
      title: i18next.t('system.apiKeyColumns.colOwnerUser'),
      dataIndex: 'userName',
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.userName || record.loginName}</strong>
          </div>
          {record.userName && (
            <div className="text-xs text-secondary">{record.loginName}</div>
          )}
        </div>
      ),
    },
    {
      dataIndex: 'keyPrefix',
      title: i18next.t('system.apiKeyColumns.colPrefix'),
      width: 110,
    },
    {
      dataIndex: 'createdAt',
      title: i18next.t('system.apiKeyColumns.colCreatedAt'),
      width: 180,
      render: (value: unknown) => formatDateTime(value, '--'),
    },
    {
      dataIndex: 'expiresAt',
      title: i18next.t('system.apiKeyColumns.colExpiresAt'),
      width: 180,
      render: (value: unknown) =>
        value == null || value === ''
          ? i18next.t('system.apiKeyColumns.neverExpires')
          : formatDateTime(value, '--'),
    },
    {
      dataIndex: 'lastUsedAt',
      title: i18next.t('system.apiKeyColumns.colLastUsed'),
      width: 180,
      render: (value: unknown) => formatDateTime(value, '--'),
    },
    {
      dataIndex: 'status',
      title: i18next.t('system.apiKeyColumns.colStatus'),
      width: 110,
      align: 'center',
      render: (value: string) => (
        <Tag color={getApiKeyStatusColor(value)}>{value}</Tag>
      ),
    },
  ]
}
