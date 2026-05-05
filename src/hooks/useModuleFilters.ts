import { useState, useCallback } from 'react'

export interface ModuleFilterState {
  filters: Record<string, unknown>
  submittedFilters: Record<string, unknown>
  searchExpanded: boolean
}

interface Props {
  setCurrentPage: (page: number) => void
}

export function useModuleFilters({ setCurrentPage }: Props) {
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [submittedFilters, setSubmittedFilters] = useState<Record<string, unknown>>({})
  const [searchExpanded, setSearchExpanded] = useState(false)

  const handleSearch = useCallback(() => {
    setCurrentPage(1)
    setSubmittedFilters({ ...filters })
  }, [filters, setCurrentPage])

  const handleReset = useCallback(() => {
    setFilters({})
    setSubmittedFilters({})
    setCurrentPage(1)
  }, [setCurrentPage])

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  return {
    filters,
    submittedFilters,
    searchExpanded,
    setFilters,
    setSubmittedFilters,
    setSearchExpanded,
    handleSearch,
    handleReset,
    updateFilter,
  }
}
