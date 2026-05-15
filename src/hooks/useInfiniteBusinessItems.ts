import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listBusinessModule } from '@/api/business-listing'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  filters: SearchParams
  enabled: boolean
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export function useInfiniteBusinessItems({
  moduleKey,
  filters,
  enabled,
  sortBy,
  sortDirection,
}: Props) {
  const pageSize = useDefaultPageSize()
  const query = useInfiniteQuery<TableResponse<ModuleRecord>>({
    queryKey: [
      'business-grid-infinite',
      moduleKey,
      filters,
      sortBy || '',
      sortDirection || '',
    ],
    queryFn: ({ pageParam, signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        {
          currentPage: pageParam as number,
          pageSize: pageSize,
          sortBy,
          sortDirection,
        },
        { signal },
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.data?.hasMore ? allPages.length + 1 : undefined,
    enabled: enabled && !!moduleKey,
    staleTime: 5_000,
  })

  const records: ModuleRecord[] = useMemo(
    () => query.data?.pages.flatMap((p) => p?.data?.rows || []) ?? [],
    [query.data],
  )

  const total = query.data?.pages[query.data.pages.length - 1]?.data?.total ?? 0
  const responseCode = Number(query.data?.pages[0]?.code ?? 0)
  const warningMessage =
    responseCode === 0 ? '' : String(query.data?.pages[0]?.message || '')

  return {
    query,
    records,
    total,
    responseCode,
    warningMessage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  }
}
