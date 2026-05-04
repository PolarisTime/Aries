import { computed, reactive, ref, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import type {
  ModuleFilterDefinition,
  ModuleFilterOptionEntry,
  ModuleFilterOptionGroup,
  ModuleFormFieldDefinition,
  ModulePageConfig,
  ModuleQuickFilterDefinition,
} from '@/types/module-page'
import { resetReactiveObject } from '@/utils/clone-utils'

type QuickFilterLike = { values: Record<string, string | undefined> }

interface UseModuleFiltersOptions {
  config: Ref<ModulePageConfig>
  setCurrentPage: (value: number) => void
}

function createFilters(pageConfig: ModulePageConfig) {
  return Object.fromEntries(
    pageConfig.filters.map((filter) => [filter.key, filter.type === 'dateRange' ? undefined : '']),
  ) as Record<string, string | Dayjs[] | undefined>
}

function resolveFormFieldOptions(field: ModuleFormFieldDefinition | undefined) {
  if (!field?.options) {
    return []
  }
  return typeof field.options === 'function' ? field.options() : field.options
}

function isFilterOptionGroup(option: ModuleFilterOptionEntry): option is ModuleFilterOptionGroup {
  return 'options' in option
}

function areFilterValuesEqual(left: unknown, right: unknown) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return false
  }
  return String(left ?? '').trim() === String(right ?? '').trim()
}

function buildSubmittedFilters(filters: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => {
        if (Array.isArray(value) && value.length === 2) {
          return [key, value.map((item) => item.format('YYYY-MM-DD'))]
        }
        return [key, value]
      })
      .filter(([, value]) => {
        if (value === undefined || value === null) {
          return false
        }
        if (Array.isArray(value)) {
          return value.length === 2 && value.every(Boolean)
        }
        return String(value).trim().length > 0
      }),
  )
}

export function useModuleFilters(options: UseModuleFiltersOptions) {
  const { config, setCurrentPage } = options
  const submittedFilters = ref<Record<string, unknown>>({})
  const filters = reactive<Record<string, unknown>>({})
  const searchExpanded = ref(false)
  const defaultVisibleFilterCount = computed(() => config.value.defaultVisibleFilterCount ?? 3)

  const visibleFilters = computed(() =>
    searchExpanded.value ? config.value.filters : config.value.filters.slice(0, defaultVisibleFilterCount.value),
  )
  const quickFilters = computed(() => config.value.quickFilters || [])
  const hasAdvancedFilters = computed(() => config.value.filters.length > defaultVisibleFilterCount.value)

  function resolveFilterOptions(filter: ModuleFilterDefinition) {
    if (!filter.options) {
      return []
    }
    return typeof filter.options === 'function'
      ? filter.options(filters as Record<string, unknown>)
      : filter.options
  }

  function flattenFilterOptions(filter: ModuleFilterDefinition) {
    return resolveFilterOptions(filter).flatMap((option) =>
      isFilterOptionGroup(option) ? option.options : [option],
    )
  }

  function resolveModuleStatusOptions(statusField: ModuleFormFieldDefinition | undefined) {
    const formOptions = resolveFormFieldOptions(statusField).map((option) => String(option.value))
    if (formOptions.length) {
      return formOptions
    }
    const statusFilter = config.value.filters.find((filter) => filter.key === 'status')
    return statusFilter
      ? flattenFilterOptions(statusFilter).map((option) => String(option.value))
      : []
  }

  function isQuickFilterActive(filterPreset: QuickFilterLike) {
    return config.value.filters.every((filter) => {
      const currentValue = filters[filter.key]
      const expectedValue = filterPreset.values[filter.key]
      if (filter.type === 'dateRange') {
        return expectedValue === undefined && (currentValue === undefined || currentValue === null)
      }
      return areFilterValuesEqual(currentValue, expectedValue)
    })
  }

  const activeQuickFilterKey = computed(() =>
    quickFilters.value.find((filterPreset) => isQuickFilterActive(filterPreset))?.key || '',
  )

  function resetFilters() {
    resetReactiveObject(filters as Record<string, unknown>, createFilters(config.value))
    submittedFilters.value = {}
    searchExpanded.value = false
  }

  function handleSearch() {
    submittedFilters.value = buildSubmittedFilters(filters)
    setCurrentPage(1)
  }

  function applyQuickFilter(filterPreset: ModuleQuickFilterDefinition) {
    resetReactiveObject(filters as Record<string, unknown>, createFilters(config.value))
    Object.entries(filterPreset.values).forEach(([key, value]) => {
      filters[key] = value ?? ''
    })
    handleSearch()
  }

  function handleFilterValueChange() {
    config.value.filters.forEach((filter) => {
      if (filter.type !== 'select') {
        return
      }
      const currentValue = String(filters[filter.key] ?? '').trim()
      if (!currentValue) {
        return
      }
      const availableOptions = flattenFilterOptions(filter)
      if (!availableOptions.length) {
        return
      }
      if (!availableOptions.some((option) => option.value === currentValue)) {
        filters[filter.key] = ''
      }
    })
  }

  function setFilterValue(key: string, value: unknown) {
    filters[key] = value
  }

  function applyKeywordFilter(keyword: string) {
    const docNo = keyword.trim()
    const hasKeywordFilter = config.value.filters.some((item) => item.key === 'keyword')
    if (!docNo || !hasKeywordFilter) {
      return false
    }

    filters.keyword = docNo
    submittedFilters.value = {
      ...submittedFilters.value,
      keyword: docNo,
    }
    setCurrentPage(1)
    return true
  }

  return {
    activeQuickFilterKey,
    applyKeywordFilter,
    applyQuickFilter,
    createFilters,
    filters,
    handleFilterValueChange,
    handleSearch,
    hasAdvancedFilters,
    quickFilters,
    resetFilters,
    resolveModuleStatusOptions,
    searchExpanded,
    setFilterValue,
    submittedFilters,
    visibleFilters,
  }
}
