import { useState } from 'react'
import type { SearchParams } from '@/types/api-raw'

interface Props {
  setCurrentPage: (page: number) => void
}

export function useModuleFilters({ setCurrentPage }: Props) {
  const [filters, setFilters] = useState<SearchParams>({})
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})

  const handleSearch = () => {
    setCurrentPage(1)
    setSubmittedFilters({ ...filters })
  }

  const handleReset = () => {
    setFilters({})
    setSubmittedFilters({})
    setCurrentPage(1)
  }

  const applyFilters = (nextFilters: SearchParams) => {
    setFilters({ ...nextFilters })
    setSubmittedFilters({ ...nextFilters })
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
