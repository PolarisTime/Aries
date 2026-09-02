import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterOption,
  ModuleFilterOptionEntry,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/** Segmented 筛选的“全部”占位值，命中时表示清空该筛选。 */
export const SEGMENTED_ALL_VALUE = '__module-filter-all__'

export function resolveSegmentedFilterValue(value: unknown): string {
  const normalized = asString(value).trim()
  return normalized || SEGMENTED_ALL_VALUE
}

export function toSegmentedOptions(
  entries: readonly ModuleFilterOptionEntry[],
): { label: string; value: string }[] {
  return entries.flatMap((entry) => {
    if ('options' in entry) {
      return entry.options.map((item: ModuleFilterOption) => ({
        label: item.label,
        value: String(item.value),
      }))
    }
    return [{ label: entry.label, value: String(entry.value) }]
  })
}

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
