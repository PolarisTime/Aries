import { http } from '@/api/client'
import { queryClient } from '@/lib/query-client'
import type { ApiResponse } from '@/types/api'

export type QueryCachedOptionsConfig<T, TRaw = T> = {
  endpoint: string
  queryKey: readonly unknown[]
  normalizer?: (data: TRaw[]) => T[]
  staleTime?: number
}

export type QueryCachedOptionsReturn<T> = {
  fetch: () => Promise<T[]>
  get: () => T[]
  reload: () => Promise<T[]>
}

const MASTER_OPTION_STALE_TIME = 300_000

export function createQueryCachedOptions<T, TRaw = T>({
  endpoint,
  normalizer,
  queryKey,
  staleTime = MASTER_OPTION_STALE_TIME,
}: QueryCachedOptionsConfig<T, TRaw>): QueryCachedOptionsReturn<T> {
  const fetchOptions = async (): Promise<T[]> => {
    const response = await http.get<ApiResponse<TRaw[]>>(endpoint)
    const data = response.data || []
    return normalizer ? normalizer(data) : (data as unknown as T[])
  }

  const getOptions = (): T[] => {
    const cached = queryClient.getQueryData<T[]>(queryKey)
    if (cached !== undefined) {
      return cached
    }

    void queryClient.prefetchQuery({
      queryKey,
      queryFn: fetchOptions,
      staleTime,
    })
    return []
  }

  const reloadOptions = async (): Promise<T[]> => {
    queryClient.setQueryData(queryKey, [])
    await queryClient.invalidateQueries({ queryKey })
    try {
      return await queryClient.fetchQuery({
        queryKey,
        queryFn: fetchOptions,
        staleTime: 0,
      })
    } catch {
      return []
    }
  }

  return {
    fetch: fetchOptions,
    get: getOptions,
    reload: reloadOptions,
  }
}
