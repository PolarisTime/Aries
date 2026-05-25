import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business-listing'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { trackLoadTaskOnce } from '@/utils/lazy-load-progress'

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
    queryKey: QUERY_KEYS.businessGridList(
      moduleKey,
      filters,
      sortBy || '',
      sortDirection || '',
      currentPage,
      pageSize,
    ),
    queryFn: ({ signal }) => {
      const listTask = () =>
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
        )

      if (
        currentPage === 1 &&
        pageSize === 20 &&
        !sortBy &&
        !sortDirection &&
        Object.keys(filters).length === 0
      ) {
        return trackLoadTaskOnce(
          `business-grid-first-page:${moduleKey}`,
          `${moduleKey} 首屏数据`,
          listTask,
        )
      }

      return listTask()
    },
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
