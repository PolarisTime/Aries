import type { QueryValue } from '@/api/module-contracts'
import {
  getModuleConfig,
  type ModuleEndpointConfig,
} from '@/api/module-contracts'
import { getModulePageSchema } from '@/config/module-page-schema'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleFilterDefinition, ModuleRecord } from '@/types/module-page'
import type { ListQueryOptions } from '@/utils/list'
import { asString, safe } from '@/utils/type-narrowing'
import { FULL_SCAN_PAGE_SIZE } from './business-listing-constants'

export function hasValue(value: unknown) {
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

export function isServerFilterKey(
  endpointConfig: ModuleEndpointConfig,
  key: string,
) {
  return Boolean(
    endpointConfig.nativeFilterKeys?.includes(key) ||
      endpointConfig.dateRangeMapping?.[key],
  )
}

export function shouldClientFilter(moduleKey: string, search: SearchParams) {
  const endpointConfig = getModuleConfig(moduleKey)
  const keys = Object.keys(search).filter((key) => hasValue(search[key]))
  return keys.some((key) => !isServerFilterKey(endpointConfig, key))
}

export function buildFilterParams(moduleKey: string, search: SearchParams) {
  const endpointConfig = getModuleConfig(moduleKey)
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
  useClientFilter: boolean,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  const params: Record<string, QueryValue> = {
    ...buildFilterParams(moduleKey, search),
    page: useClientFilter ? 0 : Math.max(options.currentPage - 1, 0),
    size: useClientFilter ? FULL_SCAN_PAGE_SIZE : options.pageSize,
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

function applyFilterDefinition(
  record: ModuleRecord,
  filter: ModuleFilterDefinition,
  rawValue: unknown,
) {
  if (!hasValue(rawValue)) {
    return true
  }

  if (filter.type === 'input') {
    const keyword = asString(rawValue).trim().toLowerCase()
    if (!keyword) return true

    const recordSearchKeys = filter.clientSearchKeys || []
    const lineItemSearchKeys = filter.clientSearchLineItemKeys || []
    const rec = safe(record)

    if (recordSearchKeys.length || lineItemSearchKeys.length) {
      const matchedRecordField = recordSearchKeys.some((key) =>
        rec.str(key).toLowerCase().includes(keyword),
      )
      if (matchedRecordField) return true
      if (!lineItemSearchKeys.length || !Array.isArray(record.items))
        return false

      return record.items.some((item) => {
        const it = safe(item)
        return lineItemSearchKeys.some((key) =>
          it.str(key).toLowerCase().includes(keyword),
        )
      })
    }

    return Object.values(record).some((value) =>
      asString(value).toLowerCase().includes(keyword),
    )
  }

  if (filter.type === 'select') {
    return safe(record).str(filter.key) === asString(rawValue)
  }

  if (
    filter.type === 'dateRange' &&
    Array.isArray(rawValue) &&
    rawValue.length === 2
  ) {
    const [start, end] = rawValue
    const current = safe(record).str(filter.key)
    if (!current || !start || !end) return true
    return current >= asString(start) && current <= asString(end)
  }

  return true
}

export function applyClientFilters(
  moduleKey: string,
  rows: ModuleRecord[],
  search: SearchParams,
) {
  const filters = getModulePageSchema(moduleKey)?.filters
  if (!filters?.length) {
    return rows
  }

  return rows.filter((record) =>
    filters.every((filter) =>
      applyFilterDefinition(record, filter, search[filter.key]),
    ),
  )
}

export function paginateRows(rows: ModuleRecord[], options: ListQueryOptions) {
  const start = Math.max(options.currentPage - 1, 0) * options.pageSize
  return rows.slice(start, start + options.pageSize)
}
