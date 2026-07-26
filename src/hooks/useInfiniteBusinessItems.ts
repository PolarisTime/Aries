import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business/business-listing'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleListRecordFor } from '@/types/module-record'

interface Props<Key extends ModuleKey> {
  moduleKey: Key
  filters: SearchParams
  enabled: boolean
  currentPage: number
  pageSize: number
}

interface BusinessItemsResult<RecordType> {
  records: RecordType[]
  total: number
  responseCode: number
  errorMessage: string
  hasError: boolean
  isLoading: boolean
  isFetching: boolean
  retry: ReturnType<typeof useQuery>['refetch']
}

export function useInfiniteBusinessItems<Key extends ModuleKey>({
  moduleKey,
  filters,
  enabled,
  currentPage,
  pageSize,
}: Props<Key>): BusinessItemsResult<ModuleListRecordFor<Key>> {
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
        { currentPage, pageSize },
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
  const records: ModuleListRecordFor<Key>[] = hasError
    ? []
    : (data?.data?.rows ?? [])
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
