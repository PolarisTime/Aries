import type { AxiosRequestConfig } from 'axios'
import { normalizeRows } from '@/api/business-normalizers'
import type { LeoPageData } from '@/api/business-types'
import { http } from '@/api/client'
import { getModuleConfig, type QueryValue } from '@/api/module-contracts'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import {
  FULL_SCAN_PAGE_SIZE,
  MAX_CLIENT_FILTER_ROWS,
} from './business-listing-constants'
import { buildFilterParams } from './business-listing-filtering'
import { reportClientFilterTruncation } from './business-listing-warnings'

export async function fetchModulePage(
  moduleKey: string,
  params: Record<string, QueryValue>,
  page: number,
  size: number,
  config?: AxiosRequestConfig,
  fields?: string[],
) {
  const endpointConfig = getModuleConfig(moduleKey)
  const response = await http.get<
    ApiResponse<LeoPageData<Record<string, unknown>>>
  >(endpointConfig.path, {
    ...config,
    params: {
      ...params,
      page,
      size,
      ...(fields?.length
        ? {
            [endpointConfig.fieldsParam || 'fields']: fields.join(','),
          }
        : {}),
      ...(config?.params as Record<string, unknown> | undefined),
    },
  })

  return {
    rows: normalizeRows(response.data?.records),
    totalElements: Number(response.data?.totalElements ?? 0),
    totalPages: Math.max(Number(response.data?.totalPages ?? 1), 1),
    last: Boolean(response.data?.last),
  }
}

export async function fetchAllModuleRows(
  moduleKey: string,
  search: Record<string, unknown>,
  enforceLimit = false,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<{ rows: ModuleRecord[]; truncated: boolean }> {
  const filterParams = buildFilterParams(moduleKey, search)
  const allRows: ModuleRecord[] = []
  let page = 0
  let totalFetched = 0
  let truncated = false

  while (true) {
    const current = await fetchModulePage(
      moduleKey,
      filterParams,
      page,
      FULL_SCAN_PAGE_SIZE,
      config,
      fields,
    )
    allRows.push(...current.rows)
    totalFetched += current.rows.length

    if (enforceLimit && totalFetched >= MAX_CLIENT_FILTER_ROWS) {
      reportClientFilterTruncation(moduleKey, MAX_CLIENT_FILTER_ROWS)
      truncated = true
      break
    }

    if (current.last || page >= current.totalPages - 1) {
      break
    }

    page += 1
  }

  return { rows: allRows, truncated }
}
