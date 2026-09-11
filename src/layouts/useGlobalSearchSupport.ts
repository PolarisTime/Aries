import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { searchGlobalDocuments } from '@/api/system/global-search'
import type { ModulePageMeta } from '@/config/module-page-meta'
import { modulePageMetaMap } from '@/config/module-page-meta'
import { getSearchableModuleKeys } from '@/config/page-registry'
import { QUERY_KEYS } from '@/constants/query-keys'
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
  const { onJump, moduleKeys: moduleKeysOption } = options
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [searchDebouncer] = useState(() =>
    createGlobalSearchDebouncer(GLOBAL_SEARCH_DEBOUNCE_MS),
  )
  const queryClient = useQueryClient()

  const moduleKeys = useMemo(
    () => moduleKeysOption ?? getSearchableModuleKeys(),
    [moduleKeysOption],
  )
  const searchModule = options.searchModule
  const pageConfigs = options.pageConfigs
  const buildSummary = options.buildSummary

  const searchDocuments = useCallback(
    async (normalizedKeyword: string, signal?: AbortSignal) => {
      if (searchModule) {
        return searchModules({
          keyword: normalizedKeyword,
          moduleKeys,
          pageConfigs: pageConfigs ?? modulePageMetaMap,
          searchModule,
          buildSummary: buildSummary ?? buildGlobalSearchSummary,
        })
      }
      return searchGlobalDocuments(normalizedKeyword, moduleKeys, signal)
    },
    [buildSummary, moduleKeys, pageConfigs, searchModule],
  )

  const normalizedKeyword = normalizeGlobalSearchKeyword(debouncedKeyword)
  const searchEnabled = shouldSearchGlobalKeyword(normalizedKeyword)

  const query = useQuery({
    queryKey: QUERY_KEYS.globalSearch(normalizedKeyword, moduleKeys),
    queryFn: ({ signal }) => searchDocuments(normalizedKeyword, signal),
    enabled: searchEnabled,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  useEffect(() => {
    return () => {
      searchDebouncer.cancel()
    }
  }, [searchDebouncer])

  const clearResults = useCallback(() => {
    setDebouncedKeyword('')
  }, [])

  const performSearch = useCallback(
    async (rawKeyword: string): Promise<GlobalSearchResult[]> => {
      const normalized = normalizeGlobalSearchKeyword(rawKeyword)
      if (!shouldSearchGlobalKeyword(normalized)) {
        searchDebouncer.cancel()
        clearResults()
        return []
      }

      setDebouncedKeyword(normalized)
      try {
        return await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.globalSearch(normalized, moduleKeys),
          queryFn: ({ signal }) => searchDocuments(normalized, signal),
          staleTime: Number.POSITIVE_INFINITY,
          retry: false,
        })
      } catch {
        return []
      }
    },
    [clearResults, moduleKeys, queryClient, searchDebouncer, searchDocuments],
  )

  const jumpToResult = (result: GlobalSearchResult) => {
    searchDebouncer.cancel()
    clearResults()
    onJump(result)
  }

  const handleSearch = (value: string) => {
    setKeyword(value)
    const normalized = normalizeGlobalSearchKeyword(value)
    if (!shouldSearchGlobalKeyword(normalized)) {
      searchDebouncer.cancel()
      clearResults()
      return
    }

    searchDebouncer.schedule(normalized, (nextKeyword) => {
      setDebouncedKeyword(nextKeyword)
    })
  }

  const handleBlur = () => {
    searchDebouncer.cancel()
    if (typeof window === 'undefined') {
      clearResults()
      return
    }

    window.setTimeout(() => {
      clearResults()
    }, 120)
  }

  const results = searchEnabled ? (query.data ?? []) : []

  const handleSelect = (value: string) => {
    const target = results.find((item) => item.value === value)
    if (target) {
      jumpToResult(target)
    }
  }

  const handleSubmit = async (value: string) => {
    const normalized = normalizeGlobalSearchKeyword(value)
    searchDebouncer.cancel()
    if (!shouldSearchGlobalKeyword(normalized)) {
      clearResults()
      return
    }

    const matchedResults = await performSearch(normalized)
    const exactMatched = matchedResults.find(
      (item) => item.primaryNo === normalized || item.trackId === normalized,
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
    loading: query.isFetching,
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
