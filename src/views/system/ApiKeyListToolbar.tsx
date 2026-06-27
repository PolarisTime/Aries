import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ApiKeyUserOption } from '@/api/api-keys'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import {
  buildApiKeyStatusOptions,
  buildApiKeyUsageScopeOptions,
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
  const statusOptions = buildApiKeyStatusOptions(t)
  const usageScopeOptions = buildApiKeyUsageScopeOptions(t)

  return (
    <SystemTableToolbar
      keyword={keyword}
      keywordPlaceholder={t('system.apiKey.searchPlaceholder')}
      keywordWidth={280}
      onKeywordChange={onKeywordChange}
      onSearch={onSearch}
      onRefresh={onRefresh}
      onCreate={canCreate ? onCreate : undefined}
      refreshLabel={t('common.refresh')}
      createLabel={t('system.apiKey.generateButton')}
      createDisabled={totpDisabled}
    >
      <Select
        showSearch={{
          filterOption: (input, option) =>
            String(option?.label || '')
              .toLowerCase()
              .includes(input.toLowerCase()),
        }}
        allowClear
        placeholder={t('system.apiKey.filterUserPlaceholder')}
        className="w-260"
        value={filterUserId}
        onChange={onFilterUserChange}
        options={userOptions.map((item) => ({
          label: getApiKeyUserDisplayName(item),
          value: String(item.id || ''),
        }))}
      />
      <Select
        allowClear
        placeholder={t('system.apiKey.allStatus')}
        className="w-140"
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={statusOptions}
      />
      <Select
        allowClear
        placeholder={t('system.apiKey.allScope')}
        className="w-150"
        value={usageScopeFilter}
        onChange={onUsageScopeFilterChange}
        options={usageScopeOptions}
      />
    </SystemTableToolbar>
  )
}
