import { useMemo } from 'react'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { getBusinessListCache, setBusinessListCache } from '@/utils/storage'

const BUSINESS_LIST_CACHE_MAX_AGE_MS = 90_000

type CachedListResponse = TableResponse<ModuleRecord>

function normalizeForCache(value: unknown) {
  return JSON.stringify(value ?? null)
}

export function buildBusinessListCacheKey(input: {
  moduleKey: string
  filters: SearchParams
  page: number
  pageSize: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}) {
  return [
    input.moduleKey,
    normalizeForCache(input.filters),
    input.page,
    input.pageSize,
    input.sortBy || '',
    input.sortDirection || '',
  ].join('::')
}

export function useBusinessListCache(params: {
  moduleKey: string
  filters: SearchParams
  page: number
  pageSize: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}) {
  const cacheKey = useMemo(
    () => buildBusinessListCacheKey(params),
    [
      params.filters,
      params.moduleKey,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortDirection,
      params,
    ],
  )

  const cached = useMemo(
    () =>
      getBusinessListCache<CachedListResponse>(
        cacheKey,
        BUSINESS_LIST_CACHE_MAX_AGE_MS,
      )?.data || null,
    [cacheKey],
  )

  return {
    cacheKey,
    cached,
    save: (data: CachedListResponse) => setBusinessListCache(cacheKey, data),
  }
}
