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
} from '@/api/business-listing-warnings'
import type { SearchParams } from '@/types/api-raw'
import type { ListQueryOptions } from '@/utils/list'

export async function listBusinessModule(
  moduleKey: string,
  search: SearchParams,
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
  return buildTableResponse(
    current.rows,
    current.totalElements,
    false,
    current.hasMore,
  )
}

export async function listAllBusinessModuleRows(
  moduleKey: string,
  search: SearchParams,
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
