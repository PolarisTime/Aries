import { useCallback, useState } from 'react'
import type { SearchParams } from '@/types/api-raw'

interface ModuleFilterState {
  filters: SearchParams
  submittedFilters: SearchParams
}

interface Props {
  setCurrentPage: (page: number) => void
}

export function useModuleFilters({ setCurrentPage }: Props) {
  const [filters, setFilters] = useState<SearchParams>({})
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})

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
    setFilters,
    setSubmittedFilters,
    handleSearch,
    handleReset,
    updateFilter,
  }
}
