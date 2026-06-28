import { useEffect, useRef, useState } from 'react'
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
  const dateRangeField = config?.filters.find(
    (field) => field.type === 'dateRange',
  )
  if (!dateRangeField) return {}

  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)

  return {
    [dateRangeField.key]: [formatLocalDate(start), formatLocalDate(today)],
  }
}

export function useModuleFilters({
  defaultFilters = {},
  setCurrentPage,
}: Props) {
  const defaultFiltersKey = serializeFilters(defaultFilters)
  const previousDefaultFiltersRef = useRef<SearchParams>(
    cloneFilters(defaultFilters),
  )
  const previousDefaultFiltersKeyRef = useRef(defaultFiltersKey)
  const [filters, setFilters] = useState<SearchParams>(() =>
    cloneFilters(defaultFilters),
  )
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>(() =>
    cloneFilters(defaultFilters),
  )

  useEffect(() => {
    if (previousDefaultFiltersKeyRef.current === defaultFiltersKey) return

    const previousDefaultFilters = previousDefaultFiltersRef.current
    previousDefaultFiltersRef.current = cloneFilters(defaultFilters)
    previousDefaultFiltersKeyRef.current = defaultFiltersKey

    setFilters((prev) =>
      mergeDefaultFilters(prev, previousDefaultFilters, defaultFilters),
    )
    setSubmittedFilters((prev) =>
      mergeDefaultFilters(prev, previousDefaultFilters, defaultFilters),
    )
  }, [defaultFilters, defaultFiltersKey])

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
