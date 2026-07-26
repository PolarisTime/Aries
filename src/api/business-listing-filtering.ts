import type { QueryValue } from '@/api/module-contracts'
import {
  getModuleConfig,
  type ModuleEndpointConfig,
} from '@/api/module-contracts'
import type { SearchParams } from '@/types/api-raw'
import type { ListQueryOptions } from '@/utils/list'
import { asString } from '@/utils/type-narrowing'

function hasValue(value: unknown) {
  if (value == null) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(Boolean)
  }
  return true
}

function isServerFilterKey(
  endpointConfig: Pick<
    ModuleEndpointConfig,
    'nativeFilterKeys' | 'dateRangeMapping'
  >,
  key: string,
) {
  return Boolean(
    endpointConfig.nativeFilterKeys?.includes(key) ||
      endpointConfig.dateRangeMapping?.[key],
  )
}

export function buildFilterParams(moduleKey: string, search: SearchParams) {
  return buildFilterParamsFromContract(getModuleConfig(moduleKey), search)
}

export function buildFilterParamsFromContract(
  endpointConfig: Pick<
    ModuleEndpointConfig,
    'nativeFilterKeys' | 'dateRangeMapping'
  >,
  search: SearchParams,
) {
  const params: Record<string, QueryValue> = {}

  Object.entries(search).forEach(([key, value]) => {
    if (!hasValue(value)) {
      return
    }

    const dateRangeMapping = endpointConfig.dateRangeMapping?.[key]
    if (dateRangeMapping && Array.isArray(value) && value.length === 2) {
      params[dateRangeMapping.startKey] = asString(value[0])
      params[dateRangeMapping.endKey] = asString(value[1])
      return
    }

    if (isServerFilterKey(endpointConfig, key)) {
      params[key] = Array.isArray(value) ? value.map(asString) : asString(value)
    }
  })

  return params
}

export function getUnsupportedFilterKeys(
  moduleKey: string,
  search: SearchParams,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  return Object.keys(search).filter(
    (key) => hasValue(search[key]) && !isServerFilterKey(endpointConfig, key),
  )
}

export function buildQueryParams(
  moduleKey: string,
  search: SearchParams,
  options: ListQueryOptions,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  const params: Record<string, QueryValue> = {
    ...buildFilterParams(moduleKey, search),
    page: Math.max(options.currentPage - 1, 0),
    size: options.pageSize,
  }

  if (options.sortBy) {
    params[endpointConfig.sortByParam || 'sortBy'] = options.sortBy
  }

  if (options.sortDirection) {
    params[endpointConfig.sortDirectionParam || 'direction'] =
      options.sortDirection
  }

  return params
}
