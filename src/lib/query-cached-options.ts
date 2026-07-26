import { type ZodType, z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/core/client'
import { queryClient } from '@/lib/query-client'

export type QueryCachedOptionsConfig<T, TRaw = T> = {
  endpoint: string
  queryKey: readonly unknown[]
  itemSchema: ZodType<TRaw>
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
  itemSchema,
  normalizer,
  queryKey,
  staleTime = MASTER_OPTION_STALE_TIME,
}: QueryCachedOptionsConfig<T, TRaw>): QueryCachedOptionsReturn<T> {
  const responseSchema = z.object({
    code: z.number(),
    data: z.array(itemSchema),
    message: z.string().optional(),
    traceId: z.string().optional(),
  })

  const fetchOptions = async (): Promise<T[]> => {
    const response = assertApiSuccess(
      await apiGet(endpoint, responseSchema),
      '加载下拉选项失败',
    )
    const data = response.data
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
