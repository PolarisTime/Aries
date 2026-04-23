import type { PagedResult, TableResponse } from '@/types/api'

export interface ListQueryOptions {
  currentPage: number
  pageSize: number
}

export function compactSearch<T extends object>(search: T) {
  return Object.fromEntries(
    Object.entries(search as Record<string, unknown>).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false
      }

      if (typeof value === 'string') {
        return value.trim().length > 0
      }

      return true
    }),
  )
}

export function buildListParams(
  search: object,
  options: ListQueryOptions,
) {
  return {
    search: JSON.stringify(compactSearch(search)),
    currentPage: options.currentPage,
    pageSize: options.pageSize,
  }
}

export function normalizeTableResponse<T>(
  response: TableResponse<T> | undefined,
): PagedResult<T> {
  return {
    rows: response?.data?.rows ?? [],
    total: Number(response?.data?.total ?? 0),
  }
}
