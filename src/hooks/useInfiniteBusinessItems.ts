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
  const { data, error, isFetching, isLoading } = useQuery({
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

  const records: ModuleRecord[] = data?.data?.rows ?? []
  const total = data?.data?.total ?? 0
  const responseCode = Number(data?.code ?? 0)
  const warningMessage = responseCode === 0 ? '' : String(data?.message || '')

  return {
    records,
    total,
    responseCode,
    warningMessage,
    isLoading,
    isFetching,
    error,
  }
}
