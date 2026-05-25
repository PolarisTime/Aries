import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import {
  listUserAccounts,
  type UserAccountListParams,
} from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import { trackLoadTaskOnce } from '@/utils/lazy-load-progress'

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
    queryFn: () => {
      const params: UserAccountListParams = {
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
      }
      if (
        currentPage === 1 &&
        pageSize === 20 &&
        !params.keyword &&
        !params.status
      ) {
        return trackLoadTaskOnce(
          'user-account-first-page',
          '用户账户首屏数据',
          () => listUserAccounts(params),
        )
      }
      return listUserAccounts(params)
    },
    enabled,
  })

  const users = useMemo(() => usersData?.records || [], [usersData])
  const totalElements = useMemo(
    () => Number(usersData?.totalElements) || 0,
    [usersData],
  )

  const refresh = useRefreshQuery('user-account')

  const handleSearch = useCallback(() => {
    setCurrentPage(1)
    refresh()
  }, [refresh])

  const handleStatusFilterChange = useCallback((value?: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page)
    setPageSize(size)
  }, [])

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
