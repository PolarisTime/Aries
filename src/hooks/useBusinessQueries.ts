import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  filters: Record<string, unknown>
  page: number
  pageSize: number
  enabled: boolean
}

export function useBusinessQueries({
  moduleKey,
  filters,
  page,
  pageSize,
  enabled,
}: Props) {
  const listQuery = useQuery({
    queryKey: ['business-grid', moduleKey, filters, page, pageSize],
    queryFn: () =>
      listBusinessModule(moduleKey, filters, {
        currentPage: page,
        pageSize,
      }),
    enabled: enabled && !!moduleKey,
    placeholderData: keepPreviousData,
  })

  const records: ModuleRecord[] = listQuery.data?.data?.rows || []
  const total = listQuery.data?.data?.total || 0

  return {
    listQuery,
    records,
    total,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
  }
}
