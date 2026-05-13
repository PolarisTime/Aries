import type { AxiosRequestConfig } from 'axios'
import {
  fetchAllModuleRows,
  fetchModulePage,
} from '@/api/business-listing-fetch'
import {
  applyClientFilters,
  buildQueryParams,
  paginateRows,
  shouldClientFilter,
} from '@/api/business-listing-filtering'
import { buildTableResponse } from '@/api/business-listing-response'
import {
  reportClientFilterFallback,
  reportUnpaginatedRowFetch,
  resetReportedClientFilterSignatures,
} from '@/api/business-listing-warnings'
import { normalizeRows } from '@/api/business-normalizers'
import { http, isSuccessCode } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import type { ListQueryOptions } from '@/utils/list'

export { resetReportedClientFilterSignatures }

export async function listBusinessModule(
  moduleKey: string,
  search: Record<string, unknown>,
  options: ListQueryOptions,
  config?: AxiosRequestConfig,
  fields?: string[],
) {
  const useClientFilter = shouldClientFilter(moduleKey, search)
  if (useClientFilter) {
    reportClientFilterFallback(moduleKey, search)
    const { rows: fetchedRows, truncated } = await fetchAllModuleRows(
      moduleKey,
      search,
      true,
      config,
      fields,
    )
    const filteredRows = applyClientFilters(moduleKey, fetchedRows, search)
    return buildTableResponse(
      paginateRows(filteredRows, options),
      filteredRows.length,
      truncated,
    )
  }

  const params = buildQueryParams(moduleKey, search, options, false)
  const current = await fetchModulePage(
    moduleKey,
    params,
    Number(params.page || 0),
    Number(params.size || options.pageSize),
    config,
    fields,
  )
  return buildTableResponse(current.rows, current.totalElements)
}

export async function searchBusinessModule(
  moduleKey: string,
  keyword = '',
  limit = 100,
  config?: AxiosRequestConfig,
): Promise<ModuleRecord[]> {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    return []
  }

  const normalizedKeyword = keyword.trim()
  const maxSize = Math.min(limit, 500)

  if (endpointConfig.supportsSearch !== false) {
    try {
      const response = await http.get<ApiResponse<Record<string, unknown>[]>>(
        `${endpointConfig.path}/search`,
        {
          ...config,
          params: {
            keyword: normalizedKeyword,
            limit: maxSize,
            ...(config?.params as Record<string, unknown> | undefined),
          },
        },
      )
      if (isSuccessCode(response.code) && Array.isArray(response.data)) {
        return normalizeRows(response.data)
      }
    } catch {
      if (endpointConfig.supportsSearch === true) {
        throw new Error(`加载${moduleKey}搜索结果失败`)
      }
    }
  }

  const page = await fetchModulePage(
    moduleKey,
    buildQueryParams(
      moduleKey,
      { keyword: normalizedKeyword },
      { currentPage: 1, pageSize: maxSize },
      false,
    ),
    0,
    maxSize,
    config,
    undefined,
  )
  return page.rows
}

export async function listAllBusinessModuleRows(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const useClientFilter = shouldClientFilter(moduleKey, search)
  if (useClientFilter) {
    reportClientFilterFallback(moduleKey, search)
  }
  const { rows: fetchedRows } = await fetchAllModuleRows(moduleKey, search)
  reportUnpaginatedRowFetch(moduleKey, fetchedRows.length)
  return useClientFilter
    ? applyClientFilters(moduleKey, fetchedRows, search)
    : fetchedRows
}
