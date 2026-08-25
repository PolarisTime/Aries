import { useEffect, useRef, useState } from 'react'
import { searchGlobalDocuments } from '@/api/system/global-search'
import type { ModulePageMeta } from '@/config/module-page-meta'
import { modulePageMetaMap } from '@/config/module-page-meta'
import { getSearchableModuleKeys } from '@/config/page-registry'
import {
  buildGlobalSearchSummary,
  searchModules,
} from '@/layouts/global-search'
import {
  createGlobalSearchDebouncer,
  normalizeGlobalSearchKeyword,
  shouldSearchGlobalKeyword,
} from '@/layouts/global-search-request'
import type {
  GlobalSearchResult,
  ModuleSearchResponse,
} from '@/types/global-search'
import type { ModuleRecord } from '@/types/module-page'

const GLOBAL_SEARCH_DEBOUNCE_MS = 300

interface UseGlobalSearchSupportOptions {
  onJump: (result: GlobalSearchResult) => void
  moduleKeys?: string[]
  pageConfigs?: Record<string, ModulePageMeta>
  searchModule?: (
    moduleKey: string,
    keyword: string,
  ) => Promise<ModuleSearchResponse>
  buildSummary?: (record: ModuleRecord) => string
}

export function useGlobalSearchSupport(options: UseGlobalSearchSupportOptions) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchDebouncerRef = useRef<ReturnType<
    typeof createGlobalSearchDebouncer
  > | null>(null)
  if (searchDebouncerRef.current === null) {
    searchDebouncerRef.current = createGlobalSearchDebouncer(
      GLOBAL_SEARCH_DEBOUNCE_MS,
    )
  }
  const pendingSearchRef = useRef<{
    keyword: string
    promise: Promise<GlobalSearchResult[]>
  } | null>(null)
  const lastSearchRef = useRef<{
    keyword: string
    results: GlobalSearchResult[]
  } | null>(null)

  const cancelActiveSearch = () => {
    requestIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    pendingSearchRef.current = null
    setLoading(false)
  }

  useEffect(() => {
    return () => {
      searchDebouncerRef.current.cancel()
      requestIdRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      pendingSearchRef.current = null
    }
  }, [])

  const clearResults = () => {
    setResults([])
  }

  const performSearch = async (rawKeyword: string) => {
    const normalizedKeyword = normalizeGlobalSearchKeyword(rawKeyword)
    if (!shouldSearchGlobalKeyword(normalizedKeyword)) {
      searchDebouncerRef.current.cancel()
      cancelActiveSearch()
      clearResults()
      return []
    }

    const cachedSearch = lastSearchRef.current
    if (cachedSearch?.keyword === normalizedKeyword) {
      setResults(cachedSearch.results)
      return cachedSearch.results
    }

    const pendingSearch = pendingSearchRef.current
    if (pendingSearch?.keyword === normalizedKeyword) {
      return pendingSearch.promise
    }

    const currentRequestId = ++requestIdRef.current
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    setLoading(true)

    const handleSearchError = (): GlobalSearchResult[] => {
      if (controller.signal.aborted) {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false)
        }
        return []
      }
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
        clearResults()
      }
      return []
    }

    const searchPromise = (async () => {
      try {
        const moduleKeys = options.moduleKeys || getSearchableModuleKeys()
        const searchModule = options.searchModule
        const merged = await (searchModule
          ? searchModules({
              keyword: normalizedKeyword,
              moduleKeys,
              pageConfigs: options.pageConfigs || modulePageMetaMap,
              searchModule,
              buildSummary: options.buildSummary || buildGlobalSearchSummary,
            })
          : searchGlobalDocuments(
              normalizedKeyword,
              moduleKeys,
              controller.signal,
            ))

        if (currentRequestId !== requestIdRef.current) {
          return []
        }

        abortControllerRef.current = null
        lastSearchRef.current = {
          keyword: normalizedKeyword,
          results: merged,
        }
        setResults(merged)
        setLoading(false)
        return merged
      } catch {
        return handleSearchError()
      }
    })()

    pendingSearchRef.current = {
      keyword: normalizedKeyword,
      promise: searchPromise,
    }
    void searchPromise.finally(() => {
      if (pendingSearchRef.current?.promise === searchPromise) {
        pendingSearchRef.current = null
      }
    })
    return searchPromise
  }

  const jumpToResult = (result: GlobalSearchResult) => {
    searchDebouncerRef.current.cancel()
    cancelActiveSearch()
    clearResults()
    options.onJump(result)
  }

  const handleSearch = (value: string) => {
    setKeyword(value)
    const normalizedKeyword = normalizeGlobalSearchKeyword(value)
    if (!shouldSearchGlobalKeyword(normalizedKeyword)) {
      searchDebouncerRef.current.cancel()
      cancelActiveSearch()
      clearResults()
      return
    }

    searchDebouncerRef.current.schedule(normalizedKeyword, (keyword) => {
      void performSearch(keyword)
    })
  }

  const handleBlur = () => {
    searchDebouncerRef.current.cancel()
    if (typeof window === 'undefined') {
      clearResults()
      return
    }

    window.setTimeout(() => {
      clearResults()
    }, 120)
  }

  const handleSelect = (value: string) => {
    const target = results.find((item) => item.value === value)
    if (target) {
      jumpToResult(target)
    }
  }

  const handleSubmit = async (value: string) => {
    const normalizedKeyword = normalizeGlobalSearchKeyword(value)
    searchDebouncerRef.current.cancel()
    if (!shouldSearchGlobalKeyword(normalizedKeyword)) {
      cancelActiveSearch()
      clearResults()
      return
    }

    const matchedResults = await performSearch(normalizedKeyword)
    const exactMatched = matchedResults.find(
      (item) =>
        item.primaryNo === normalizedKeyword ||
        item.trackId === normalizedKeyword,
    )
    if (exactMatched) {
      jumpToResult(exactMatched)
      return
    }

    if (matchedResults.length === 1) {
      jumpToResult(matchedResults[0])
    }
  }

  return {
    keyword,
    setKeyword,
    loading,
    results,
    resultOptions: results.map((item) => ({
      value: item.value,
      label: item.label,
    })),
    clearResults,
    handleBlur,
    handleSearch,
    handleSelect,
    handleSubmit,
    jumpToResult,
    performSearch,
  }
}
