import { useCallback, useRef, useState } from 'react'
import {
  getBusinessModuleDetail,
  listBusinessModule,
} from '@/api/business'
import { businessPageConfigs } from '@/config/business-pages'
import { getSearchableModuleKeys } from '@/config/page-registry'
import {
  buildGlobalSearchSummary,
  searchAccessibleModules,
  type GlobalSearchResult,
} from '@/layouts/global-search'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface ModuleSearchResponse {
  data?: {
    rows?: ModuleRecord[]
  }
}

interface UseGlobalSearchSupportOptions {
  canAccessModule: (moduleKey: string) => boolean
  onJump: (result: GlobalSearchResult) => void
  moduleKeys?: string[]
  pageConfigs?: Record<string, ModulePageConfig>
  searchModule?: (
    moduleKey: string,
    keyword: string,
  ) => Promise<ModuleSearchResponse>
  lookupRecordById?: (moduleKey: string, id: string) => Promise<ModuleRecord | null>
  buildSummary?: (record: ModuleRecord) => string
}

export function useGlobalSearchSupport(options: UseGlobalSearchSupportOptions) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const requestIdRef = useRef(0)

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  const performSearch = useCallback(async (rawKeyword: string) => {
    const normalizedKeyword = rawKeyword.trim()
    if (!normalizedKeyword) {
      clearResults()
      return []
    }

    const currentRequestId = ++requestIdRef.current
    setLoading(true)

    try {
      const merged = await searchAccessibleModules({
        keyword: normalizedKeyword,
        moduleKeys: options.moduleKeys || getSearchableModuleKeys(),
        pageConfigs: options.pageConfigs || businessPageConfigs,
        canAccessModule: options.canAccessModule,
        searchModule:
          options.searchModule ||
          ((moduleKey, keyword) =>
            listBusinessModule(
              moduleKey,
              { keyword },
              { currentPage: 1, pageSize: 6 },
            )),
        lookupRecordById:
          options.lookupRecordById ||
          (async (moduleKey, id) => {
            try {
              const response = await getBusinessModuleDetail(moduleKey, id)
              return response.data || null
            } catch {
              return null
            }
          }),
        buildSummary: options.buildSummary || buildGlobalSearchSummary,
      })

      if (currentRequestId !== requestIdRef.current) {
        return []
      }

      setResults(merged)
      return merged
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [clearResults, options])

  const jumpToResult = useCallback((result: GlobalSearchResult) => {
    clearResults()
    options.onJump(result)
  }, [clearResults, options])

  const handleSearch = useCallback(async (value: string) => {
    setKeyword(value)
    await performSearch(value)
  }, [performSearch])

  const handleBlur = useCallback(() => {
    if (typeof window === 'undefined') {
      clearResults()
      return
    }

    window.setTimeout(() => {
      clearResults()
    }, 120)
  }, [clearResults])

  const handleSelect = useCallback((value: string) => {
    const target = results.find((item) => item.value === value)
    if (target) {
      jumpToResult(target)
    }
  }, [jumpToResult, results])

  const handleSubmit = useCallback(async (value: string) => {
    const normalizedKeyword = value.trim()
    if (!normalizedKeyword) {
      clearResults()
      return
    }

    const matchedResults = await performSearch(normalizedKeyword)
    const exactMatched = matchedResults.find(
      (item) => item.primaryNo === normalizedKeyword || item.trackId === normalizedKeyword,
    )
    if (exactMatched) {
      jumpToResult(exactMatched)
      return
    }

    if (matchedResults.length === 1) {
      jumpToResult(matchedResults[0])
    }
  }, [clearResults, jumpToResult, performSearch])

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
