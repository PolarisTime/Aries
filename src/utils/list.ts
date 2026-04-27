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
  const code = Number(response?.code ?? 0)
  if (typeof window !== 'undefined') {
    if (code !== 0) {
      const msg = String(response?.message || '数据加载异常')
      window.dispatchEvent(new CustomEvent('leo:table-error', { detail: { code, message: msg } }))
    } else {
      window.dispatchEvent(new CustomEvent('leo:table-error-cleared'))
    }
  }
  return {
    rows: response?.data?.rows ?? [],
    total: Number(response?.data?.total ?? 0),
    errorCode: code !== 0 ? code : undefined,
    errorMessage: code !== 0 ? String(response?.message || '') : undefined,
  }
}
