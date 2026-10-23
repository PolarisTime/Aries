import { useState } from 'react'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig } from '@/types/module-page'

interface Props {
  defaultFilters?: SearchParams
  setCurrentPage: (page: number) => void
}

function cloneFilters(filters: SearchParams) {
  return { ...filters }
}

function serializeFilters(filters: SearchParams) {
  return JSON.stringify(
    Object.entries(filters).toSorted(([left], [right]) =>
      left.localeCompare(right),
    ),
  )
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftCalendarMonths(date: Date, months: number) {
  const result = new Date(date)
  const targetMonth = result.getMonth() + months
  result.setDate(1)
  result.setMonth(targetMonth)

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate()
  result.setDate(Math.min(date.getDate(), lastDayOfTargetMonth))
  return result
}

function mergeDefaultFilters(
  currentFilters: SearchParams,
  previousDefaults: SearchParams,
  nextDefaults: SearchParams,
) {
  const nextFilters = cloneFilters(currentFilters)
  for (const key of Object.keys(previousDefaults)) {
    delete nextFilters[key]
  }
  return {
    ...nextDefaults,
    ...nextFilters,
  }
}

export function buildDefaultModuleFilters(
  config?: ModulePageConfig | null,
): SearchParams {
  const defaults = cloneFilters(config?.defaultFilters || {})
  const dateRangeField = config?.filters.find(
    (field) => field.type === 'dateRange',
  )
  if (!dateRangeField || dateRangeField.defaultDateRange === false) {
    return defaults
  }

  const today = new Date()
  const start = shiftCalendarMonths(
    today,
    -(dateRangeField.defaultDateRange?.monthsBefore ?? 3),
  )
  const end = shiftCalendarMonths(
    today,
    dateRangeField.defaultDateRange?.monthsAfter ?? 0,
  )

  return {
    ...defaults,
    [dateRangeField.key]: [formatLocalDate(start), formatLocalDate(end)],
  }
}

export function useModuleFilters({
  defaultFilters = {},
  setCurrentPage,
}: Props) {
  const defaultFiltersKey = serializeFilters(defaultFilters)
  const [filters, setFilters] = useState<SearchParams>(() =>
    cloneFilters(defaultFilters),
  )
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>(() =>
    cloneFilters(defaultFilters),
  )
  /*
   * defaultFilters 变化时（模块配置加载完成 / 切换到另一模块）把「用户已改的字段」留下、
   * 把「上一版默认值」换成新默认值。**在渲染期同步完成，不放 effect**：
   *
   * 依据 react.dev《You Might Not Need an Effect》→「Adjusting some state when a prop changes」：
   * 由 prop 派生 state 属于「能在渲染期算出来的东西」，用 effect 会先提交一帧旧筛选条件、
   * 再补一帧新值（用户可见的筛选条闪烁 + 多一次提交与一次查询）。
   * 官方给的替代写法就是「用 state 记住上一次的 prop，在渲染期比对并 setState」，
   * React 会在提交前立刻丢弃这一帧重算，因此不会多渲染到屏幕上。
   *
   * 这里用「上一版默认值 + 其序列化 key」两个 state 代替原来的两个 ref：
   * key 相同（内容等价的新对象）时不动，避免父级每次渲染新建对象就重置用户筛选。
   */
  const [appliedDefaultFilters, setAppliedDefaultFilters] =
    useState<SearchParams>(() => cloneFilters(defaultFilters))
  const [appliedDefaultFiltersKey, setAppliedDefaultFiltersKey] =
    useState(defaultFiltersKey)

  if (appliedDefaultFiltersKey !== defaultFiltersKey) {
    const previousDefaultFilters = appliedDefaultFilters
    setAppliedDefaultFilters(cloneFilters(defaultFilters))
    setAppliedDefaultFiltersKey(defaultFiltersKey)
    setFilters((prev) =>
      mergeDefaultFilters(prev, previousDefaultFilters, defaultFilters),
    )
    setSubmittedFilters((prev) =>
      mergeDefaultFilters(prev, previousDefaultFilters, defaultFilters),
    )
  }

  const handleSearch = () => {
    setCurrentPage(1)
    setSubmittedFilters(cloneFilters(filters))
  }

  const handleReset = () => {
    setFilters(cloneFilters(defaultFilters))
    setSubmittedFilters(cloneFilters(defaultFilters))
    setCurrentPage(1)
  }

  const applyFilters = (nextFilters: SearchParams) => {
    setFilters(cloneFilters(nextFilters))
    setSubmittedFilters(cloneFilters(nextFilters))
    setCurrentPage(1)
  }

  const updateFilter = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return {
    filters,
    submittedFilters,
    setFilters,
    setSubmittedFilters,
    applyFilters,
    handleSearch,
    handleReset,
    updateFilter,
  }
}
