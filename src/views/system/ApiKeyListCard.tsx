import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type {
  ApiKeyActionOption,
  ApiKeyRecord,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'
import { AppProTable } from '@/components/AppProTable'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'
import { ApiKeyListToolbar } from '@/views/system/ApiKeyListToolbar'
import { buildApiKeyListColumns } from '@/views/system/api-key-list-columns'

interface Props {
  title?: string
  keyword: string
  filterUserId?: string
  statusFilter?: string
  usageScopeFilter?: string
  currentPage: number
  pageSize: number
  totalElements: number
  keys: ApiKeyRecord[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  totpDisabled: boolean
  userOptions: ApiKeyUserOption[]
  resourceOptions: ApiKeyResourceOption[]
  actionOptions: ApiKeyActionOption[]
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onFilterUserChange: (value?: string) => void
  onStatusFilterChange: (value?: string) => void
  onUsageScopeFilterChange: (value?: string) => void
  onRefresh: () => void
  onCreate: () => void
  onRevoke: (record: ApiKeyRecord) => void
  onPageChange: (page: number, pageSize: number) => void
}

export function ApiKeyListCard({
  title,
  keyword,
  filterUserId,
  statusFilter,
  usageScopeFilter,
  currentPage,
  pageSize,
  totalElements,
  keys,
  loading,
  canCreate,
  canEdit,
  totpDisabled,
  userOptions,
  resourceOptions,
  actionOptions,
  onKeywordChange,
  onSearch,
  onFilterUserChange,
  onStatusFilterChange,
  onUsageScopeFilterChange,
  onRefresh,
  onCreate,
  onRevoke,
  onPageChange,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const columns = buildApiKeyListColumns({
    canEdit,
    actionOptions,
    resourceOptions,
    onView: (record) => {
      void navigate({ to: `/api-key/${record.id}` as '/' })
    },
    onRevoke,
  })

  return (
    <AppProTable<ApiKeyRecord>
      rowKey="id"
      columns={columns}
      dataSource={keys}
      loading={loading}
      scroll={{ x: 1800 }}
      headerTitle={title}
      toolBarRender={() => [
        <ApiKeyListToolbar
          key="api-key-toolbar"
          keyword={keyword}
          filterUserId={filterUserId}
          statusFilter={statusFilter}
          usageScopeFilter={usageScopeFilter}
          canCreate={canCreate}
          totpDisabled={totpDisabled}
          userOptions={userOptions}
          onKeywordChange={onKeywordChange}
          onSearch={onSearch}
          onFilterUserChange={onFilterUserChange}
          onStatusFilterChange={onStatusFilterChange}
          onUsageScopeFilterChange={onUsageScopeFilterChange}
          onRefresh={onRefresh}
          onCreate={onCreate}
        />,
      ]}
      pagination={createPaginationConfig({
        current: currentPage,
        pageSize,
        total: totalElements,
        onChange: onPageChange,
        t,
      })}
    />
  )
}
