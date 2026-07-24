import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business-listing'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  filters: SearchParams
  enabled: boolean
  currentPage: number
  pageSize: number
}

export function useInfiniteBusinessItems({
  moduleKey,
  filters,
  enabled,
  currentPage,
  pageSize,
}: Props) {
  const { data, error, isFetching, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.businessGridList(
      moduleKey,
      filters,
      currentPage,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        {
          currentPage,
          pageSize,
        },
        { signal },
      ),
    enabled: enabled && !!moduleKey,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  })

  const responseCode = Number(data?.code ?? 0)
  const hasError = error != null || responseCode !== 0
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : responseCode !== 0
        ? String(data?.message || '').trim()
        : ''
  const records: ModuleRecord[] = hasError ? [] : (data?.data?.rows ?? [])
  const total = hasError ? 0 : (data?.data?.total ?? 0)

  return {
    records,
    total,
    responseCode,
    errorMessage,
    hasError,
    isLoading,
    isFetching,
    retry: refetch,
  }
}
