import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business-listing'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  filters: SearchParams
  enabled: boolean
  currentPage: number
  pageSize: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export function useInfiniteBusinessItems({
  moduleKey,
  filters,
  enabled,
  currentPage,
  pageSize,
  sortBy,
  sortDirection,
}: Props) {
  const query = useQuery({
    queryKey: [
      'business-grid',
      moduleKey,
      filters,
      sortBy || '',
      sortDirection || '',
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        {
          currentPage,
          pageSize,
          sortBy,
          sortDirection,
        },
        { signal },
      ),
    enabled: enabled && !!moduleKey,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  })

  const records: ModuleRecord[] = query.data?.data?.rows ?? []
  const total = query.data?.data?.total ?? 0
  const responseCode = Number(query.data?.code ?? 0)
  const warningMessage =
    responseCode === 0 ? '' : String(query.data?.message || '')

  return {
    query,
    records,
    total,
    responseCode,
    warningMessage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  }
}
