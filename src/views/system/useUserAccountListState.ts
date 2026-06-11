import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  listUserAccounts,
  type UserAccountListParams,
} from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'

export function useUserAccountListState(enabled = true) {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: usersData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.userAccount(
      currentPage,
      pageSize,
      keyword,
      statusFilter,
    ),
    queryFn: async () => {
      const params: UserAccountListParams = {
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
      }
      return listUserAccounts(params)
    },
    enabled,
  })

  const users = usersData?.records || []
  const totalElements = Number(usersData?.totalElements) || 0

  const refresh = useRefreshQuery(QUERY_KEYS.userAccountBase)

  const handleSearch = () => {
    setCurrentPage(1)
    refresh()
  }

  const handleStatusFilterChange = (value?: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page)
    setPageSize(size)
  }

  return {
    keyword,
    statusFilter,
    currentPage,
    pageSize,
    users,
    totalElements,
    isLoading,
    setKeyword,
    handleSearch,
    handleStatusFilterChange,
    handlePageChange,
    refresh,
  }
}
