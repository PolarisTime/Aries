import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
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
  return (
    <Space>
      <Input.Search
        placeholder="搜索密钥名称 / 前缀"
        style={{ width: 280 }}
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={onSearch}
      />
      <Select
        showSearch
        allowClear
        placeholder="筛选所属用户"
        style={{ width: 260 }}
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
        placeholder="全部状态"
        style={{ width: 140 }}
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={apiKeyStatusOptions}
      />
      <Select
        allowClear
        placeholder="全部范围"
        style={{ width: 150 }}
        value={usageScopeFilter}
        onChange={onUsageScopeFilterChange}
        options={apiKeyUsageScopeOptions}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
      {canCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={totpDisabled}
          onClick={onCreate}
        >
          生成 API Key
        </Button>
      )}
    </Space>
  )
}
