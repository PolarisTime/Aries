import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
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
  /** 外部传入的动态 pageSize，优先级高于系统设置 */
  dynamicPageSize?: number | null
}

export function useInfiniteBusinessItems({
  moduleKey,
  filters,
  enabled,
  sortBy,
  sortDirection,
  dynamicPageSize,
}: Props) {
  const defaultPageSize = useDefaultPageSize()
  // 优先使用外部传入的动态 pageSize，fallback 到系统设置
  const pageSize = dynamicPageSize ?? defaultPageSize
  const query = useInfiniteQuery<TableResponse<ModuleRecord>>({
    queryKey: [
      'business-grid-infinite',
      moduleKey,
      filters,
      sortBy || '',
      sortDirection || '',
      pageSize,
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
    placeholderData: keepPreviousData,
    structuralSharing: false,
  })

  const records: ModuleRecord[] = useMemo(() => {
    const all = query.data?.pages.flatMap((p) => p?.data?.rows || []) ?? []
    const seen = new Set<string>()
    return all.filter((r) => {
      const id = String(r.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [query.data])

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
