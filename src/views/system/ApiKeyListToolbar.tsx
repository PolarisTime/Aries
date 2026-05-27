import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import { useTranslation } from 'react-i18next'
import type { ApiKeyUserOption } from '@/api/api-keys'
import {
  apiKeyStatusOptions,
  apiKeyUsageScopeOptions,
} from '@/views/system/api-key-form-options'
import { getApiKeyUserDisplayName } from '@/views/system/api-key-view-utils'

interface Props {
  keyword: string
  filterUserId?: string
  statusFilter?: string
  usageScopeFilter?: string
  canCreate: boolean
  totpDisabled: boolean
  userOptions: ApiKeyUserOption[]
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onFilterUserChange: (value?: string) => void
  onStatusFilterChange: (value?: string) => void
  onUsageScopeFilterChange: (value?: string) => void
  onRefresh: () => void
  onCreate: () => void
}

export function ApiKeyListToolbar({
  keyword,
  filterUserId,
  statusFilter,
  usageScopeFilter,
  canCreate,
  totpDisabled,
  userOptions,
  onKeywordChange,
  onSearch,
  onFilterUserChange,
  onStatusFilterChange,
  onUsageScopeFilterChange,
  onRefresh,
  onCreate,
}: Props) {
  const { t } = useTranslation()
  return (
    <Space>
      <Input.Search
        placeholder={t('system.apiKey.searchPlaceholder')}
        className="w-280"
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={onSearch}
      />
      <Select
        showSearch
        allowClear
        placeholder={t('system.apiKey.filterUserPlaceholder')}
        className="w-260"
        value={filterUserId}
        onChange={onFilterUserChange}
        options={userOptions.map((item) => ({
          label: getApiKeyUserDisplayName(item),
          value: String(item.id || ''),
        }))}
        filterOption={(input, option) =>
          String(option?.label || '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
      <Select
        allowClear
        placeholder={t('system.apiKey.allStatus')}
        className="w-140"
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={apiKeyStatusOptions}
      />
      <Select
        allowClear
        placeholder={t('system.apiKey.allScope')}
        className="w-150"
        value={usageScopeFilter}
        onChange={onUsageScopeFilterChange}
        options={apiKeyUsageScopeOptions}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        {t('common.refresh')}
      </Button>
      {canCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={totpDisabled}
          onClick={onCreate}
        >
          {t('system.apiKey.generateButton')}
        </Button>
      )}
    </Space>
  )
}
