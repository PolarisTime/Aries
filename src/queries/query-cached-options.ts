import { queryClient } from '@/lib/query-client'

export type QueryCachedOptionsConfig<T> = {
  queryKey: readonly unknown[]
  fetch: () => Promise<T[]>
  staleTime?: number
}

export type QueryCachedOptionsAccessor<T> = {
  get: () => T[]
  reload: () => Promise<T[]>
}

const MASTER_OPTION_STALE_TIME = 300_000

export function createQueryCachedOptions<T>({
  queryKey,
  fetch: fetchOptions,
  staleTime = MASTER_OPTION_STALE_TIME,
}: QueryCachedOptionsConfig<T>): QueryCachedOptionsAccessor<T> {
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

  // 强制刷新并返回最新数据：仅一次网络请求；直接更新缓存并通知观察者，
  // 不再先 setQueryData([]) 造成闪空，也不额外 invalidate 造成重复请求。
  const reloadOptions = async (): Promise<T[]> => {
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
    get: getOptions,
    reload: reloadOptions,
  }
}

/** 纯缓存读取：不触发预取，命中缓存返回数据，否则返回空数组。 */
export function getCachedQueryData<T>(queryKey: readonly unknown[]): T[] {
  return queryClient.getQueryData<T[]>(queryKey) || []
}
