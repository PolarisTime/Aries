import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  filters: Record<string, unknown>
  page: number
  pageSize: number
  enabled: boolean
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export function useBusinessQueries({
  moduleKey,
  filters,
  page,
  pageSize,
  enabled,
  sortBy,
  sortDirection,
}: Props) {
  const listQuery = useQuery({
    queryKey: [
      'business-grid',
      moduleKey,
      filters,
      page,
      pageSize,
      sortBy || '',
      sortDirection || '',
    ],
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        {
          currentPage: page,
          pageSize,
          sortBy,
          sortDirection,
        },
        { signal },
      ),
    enabled: enabled && !!moduleKey,
    placeholderData: keepPreviousData,
  })

  const records: ModuleRecord[] = listQuery.data?.data?.rows || []
  const total = listQuery.data?.data?.total || 0
  const responseCode = Number(listQuery.data?.code ?? 0)
  const warningMessage =
    responseCode === 0 ? '' : String(listQuery.data?.message || '')

  return {
    listQuery,
    records,
    total,
    responseCode,
    warningMessage,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
  }
}
