import type { SearchParams } from '@/types/api-raw'

export function normalizeFilters(filters: SearchParams): SearchParams {
  const normalized: SearchParams = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    normalized[key] = value
  }
  return normalized
}

export function buildNextFilters(
  baseFilters: SearchParams,
  key: string,
  value: unknown,
  resetKeys: readonly string[] = [],
): SearchParams {
  const nextFilters = { ...baseFilters }
  for (const resetKey of resetKeys) {
    delete nextFilters[resetKey]
  }
  if (value === undefined || value === null || value === '') {
    delete nextFilters[key]
    return nextFilters
  }
  nextFilters[key] = value
  return normalizeFilters(nextFilters)
}
