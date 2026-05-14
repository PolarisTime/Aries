import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'

export type CachedOptionsConfig<T> = {
  endpoint: string
  normalizer?: (data: T[]) => T[]
}

export type CachedOptionsReturn<T> = {
  fetch: () => Promise<T[]>
  get: () => T[]
  reload: () => Promise<T[]>
}

export function createCachedOptions<T>(
  config: CachedOptionsConfig<T>,
): CachedOptionsReturn<T> {
  const { endpoint, normalizer } = config

  let cached: T[] | null = null
  let fetchFailed = false
  let loading: Promise<T[]> | null = null

  const fetchOptions = async (): Promise<T[]> => {
    if (cached !== null) return cached
    if (loading) return loading

    loading = (async () => {
      const response = await http.get<ApiResponse<T[]>>(endpoint)
      const data = response.data || []
      cached = normalizer ? normalizer(data) : data
      fetchFailed = false
      return cached
    })()

    try {
      return await loading
    } catch {
      fetchFailed = true
      return []
    } finally {
      loading = null
    }
  }

  const getOptions = (): T[] => {
    if (cached === null && !loading && !fetchFailed) {
      void fetchOptions()
    }
    return cached || []
  }

  const reloadOptions = (): Promise<T[]> => {
    cached = null
    fetchFailed = false
    loading = null
    return fetchOptions()
  }

  return {
    fetch: fetchOptions,
    get: getOptions,
    reload: reloadOptions,
  }
}
