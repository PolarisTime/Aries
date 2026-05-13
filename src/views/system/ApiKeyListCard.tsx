import { createPaginationConfig } from '@/hooks/usePaginationConfig'
import { useNavigate } from '@tanstack/react-router'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import type {
  ApiKeyActionOption,
  ApiKeyRecord,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'
import { ApiKeyListToolbar } from '@/views/system/ApiKeyListToolbar'
import { buildApiKeyListColumns } from '@/views/system/api-key-list-columns'

type Props = {
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
    <Card
      title="API Key 管理"
      extra={
        <ApiKeyListToolbar
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
        />
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={keys}
        loading={loading}
        size="middle"
        scroll={{ x: 1800 }}
        pagination={createPaginationConfig({
          current: currentPage,
          pageSize,
          total: totalElements,
          onChange: onPageChange,
        })}
      />
    </Card>
  )
}
