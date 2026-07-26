import type { AxiosRequestConfig } from 'axios'
import { fetchModulePage } from '@/api/business-listing-fetch'
import {
  buildFilterParams,
  buildQueryParams,
  getUnsupportedFilterKeys,
} from '@/api/business-listing-filtering'
import { buildTableResponse } from '@/api/business-listing-response'
import type { MainFlowModuleKey } from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type {
  LegacyModuleRecord,
  MainFlowListRecord,
  ModuleListRecordFor,
} from '@/types/module-record'
import type { ListQueryOptions } from '@/utils/list'
import { asString } from '@/utils/type-narrowing'

const SERVER_MATCH_PAGE_SIZE = 100

export function listBusinessModule<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  search: SearchParams,
  options: ListQueryOptions,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<TableResponse<MainFlowListRecord<Key>>>
export function listBusinessModule<Key extends string>(
  moduleKey: Key,
  search: SearchParams,
  options: ListQueryOptions,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<TableResponse<ModuleListRecordFor<Key>>>
export async function listBusinessModule(
  moduleKey: string,
  search: SearchParams,
  options: ListQueryOptions,
  config?: AxiosRequestConfig,
  fields?: string[],
) {
  const unsupportedKeys = getUnsupportedFilterKeys(moduleKey, search)
  if (unsupportedKeys.length) {
    throw new Error(
      `${moduleKey} 不支持服务端过滤字段：${unsupportedKeys.join(', ')}`,
    )
  }

  const params = buildQueryParams(moduleKey, search, options)
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
    current.hasMore,
  )
}

export function findServerFilteredBusinessModuleRow<
  Key extends MainFlowModuleKey,
>(
  moduleKey: Key,
  search: SearchParams,
  exactField: string,
  exactValue: string,
): Promise<MainFlowListRecord<Key> | undefined>
export function findServerFilteredBusinessModuleRow<Key extends string>(
  moduleKey: Key,
  search: SearchParams,
  exactField: string,
  exactValue: string,
): Promise<ModuleListRecordFor<Key> | undefined>
export async function findServerFilteredBusinessModuleRow(
  moduleKey: string,
  search: SearchParams,
  exactField: string,
  exactValue: string,
): Promise<LegacyModuleRecord | undefined> {
  const unsupportedKeys = getUnsupportedFilterKeys(moduleKey, search)
  if (unsupportedKeys.length) {
    throw new Error(
      `${moduleKey} 不支持服务端过滤字段：${unsupportedKeys.join(', ')}`,
    )
  }

  const filterParams = buildFilterParams(moduleKey, search)
  let page = 0
  while (true) {
    const current = await fetchModulePage(
      moduleKey,
      filterParams,
      page,
      SERVER_MATCH_PAGE_SIZE,
    )
    const matched = current.rows.find(
      (row) => asString(row[exactField]).trim() === exactValue,
    )
    if (matched) {
      return matched
    }
    if (current.last || page >= current.totalPages - 1) {
      return undefined
    }
    page += 1
  }
}
