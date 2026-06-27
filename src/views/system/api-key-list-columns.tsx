import { EyeOutlined, StopOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Tooltip } from 'antd'
import i18next from 'i18next'
import type {
  ApiKeyActionOption,
  ApiKeyRecord,
  ApiKeyResourceOption,
} from '@/api/api-keys'
import { StatusTag } from '@/components/StatusTag'
import { TableActions } from '@/components/TableActions'
import { API_KEY_STATUS } from '@/constants/status-constants'
import { formatDateTime } from '@/utils/formatters'
import {
  getApiKeyAllowedActionText,
  getApiKeyAllowedResourceText,
  getApiKeyStatusColor,
} from '@/views/system/api-key-view-utils'

const API_KEY_STATUS_MAP = {
  [API_KEY_STATUS.VALID]: { color: 'green' },
  [API_KEY_STATUS.EXPIRED]: { color: 'orange' },
  [API_KEY_STATUS.DISABLED]: { color: 'red' },
} as const

interface Options {
  canEdit: boolean
  actionOptions: ApiKeyActionOption[]
  resourceOptions: ApiKeyResourceOption[]
  onView: (record: ApiKeyRecord) => void
  onRevoke: (record: ApiKeyRecord) => void
}

function renderApiKeyScopeSummary({
  count,
  emptyText,
  fullText,
  summaryKey,
}: {
  count: number
  emptyText: string
  fullText: string
  summaryKey: string
}) {
  if (count <= 0) {
    return emptyText
  }
  return (
    <Tooltip title={fullText}>
      <span>{i18next.t(summaryKey, { count })}</span>
    </Tooltip>
  )
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
        <TableActions
          items={[
            {
              key: 'view',
              label: i18next.t('system.apiKeyColumns.view'),
              icon: <EyeOutlined />,
              onClick: () => onView(record),
            },
            {
              key: 'disable',
              label: i18next.t('system.apiKeyColumns.disable'),
              icon: <StopOutlined />,
              danger: true,
              visible: canEdit && record.status === API_KEY_STATUS.VALID,
              onClick: () => onRevoke(record),
            },
          ]}
        />
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
      width: 150,
      ellipsis: true,
      render: (value: string[]) => {
        const fullText = getApiKeyAllowedResourceText(value, resourceOptions)
        return renderApiKeyScopeSummary({
          count: value?.length || 0,
          emptyText: fullText,
          fullText,
          summaryKey: 'system.apiKeyColumns.resourceSummary',
        })
      },
    },
    {
      dataIndex: 'allowedActions',
      title: i18next.t('system.apiKeyColumns.colAllowedActions'),
      width: 140,
      ellipsis: true,
      render: (value: string[]) => {
        const fullText = getApiKeyAllowedActionText(value, actionOptions)
        return renderApiKeyScopeSummary({
          count: value?.length || 0,
          emptyText: fullText,
          fullText,
          summaryKey: 'system.apiKeyColumns.actionSummary',
        })
      },
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
        <StatusTag
          status={value}
          statusMap={{
            ...API_KEY_STATUS_MAP,
            [value]: { color: getApiKeyStatusColor(value), label: value },
          }}
        />
      ),
    },
  ]
}
