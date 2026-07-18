import { useCallback, useEffect, useState } from 'react'

interface KeywordPaginationOptions {
  defaultPageSize?: number
}

interface KeywordPaginationState {
  keyword: string
  currentPage: number
  pageSize: number
  setKeyword: (value: string) => void
  setCurrentPage: (value: number) => void
  setPageSize: (value: number) => void
  resetPage: () => void
  handlePageChange: (page: number, pageSize: number) => void
}

export function useKeywordPaginationState({
  defaultPageSize = 30,
}: KeywordPaginationOptions = {}): KeywordPaginationState {
  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  useEffect(() => {
    setCurrentPage(1)
    setPageSize(defaultPageSize)
  }, [defaultPageSize])

  const resetPage = useCallback(() => setCurrentPage(1), [])
  const handlePageChange = useCallback((page: number, nextPageSize: number) => {
    setCurrentPage(page)
    setPageSize(nextPageSize)
  }, [])

  return {
    keyword,
    currentPage,
    pageSize,
    setKeyword,
    setCurrentPage,
    setPageSize,
    resetPage,
    handlePageChange,
  }
}
