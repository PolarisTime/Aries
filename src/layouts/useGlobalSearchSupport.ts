import { useCallback, useRef, useState } from 'react'
import { getBusinessModuleDetail, searchBusinessModule } from '@/api/business'
import type { ModulePageMeta } from '@/config/module-page-meta'
import { modulePageMetaMap } from '@/config/module-page-meta'
import { getSearchableModuleKeys } from '@/config/page-registry'
import {
  buildGlobalSearchSummary,
  type GlobalSearchResult,
  searchAccessibleModules,
} from '@/layouts/global-search'
import type { ModuleRecord } from '@/types/module-page'

interface ModuleSearchResponse {
  data?: {
    rows?: ModuleRecord[]
  }
}

interface UseGlobalSearchSupportOptions {
  canAccessModule: (moduleKey: string) => boolean
  onJump: (result: GlobalSearchResult) => void
  moduleKeys?: string[]
  pageConfigs?: Record<string, ModulePageMeta>
  searchModule?: (
    moduleKey: string,
    keyword: string,
  ) => Promise<ModuleSearchResponse>
  lookupRecordById?: (
    moduleKey: string,
    id: string,
  ) => Promise<ModuleRecord | null>
  buildSummary?: (record: ModuleRecord) => string
}

export function useGlobalSearchSupport(options: UseGlobalSearchSupportOptions) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  const performSearch = useCallback(
    async (rawKeyword: string) => {
      const normalizedKeyword = rawKeyword.trim()
      if (!normalizedKeyword) {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        clearResults()
        return []
      }

      const currentRequestId = ++requestIdRef.current
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setLoading(true)

      try {
        const merged = await searchAccessibleModules({
          keyword: normalizedKeyword,
          moduleKeys: options.moduleKeys || getSearchableModuleKeys(),
          pageConfigs: options.pageConfigs || modulePageMetaMap,
          canAccessModule: options.canAccessModule,
          searchModule:
            options.searchModule ||
            (async (moduleKey, keyword) => ({
              data: {
                rows: await searchBusinessModule(moduleKey, keyword, 6, {
                  signal: controller.signal,
                }),
              },
            })),
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

        abortControllerRef.current = null
        setResults(merged)
        return merged
      } catch (error) {
        if (controller.signal.aborted) {
          return []
        }
        throw error
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [clearResults, options],
  )

  const jumpToResult = useCallback(
    (result: GlobalSearchResult) => {
      clearResults()
      options.onJump(result)
    },
    [clearResults, options],
  )

  const handleSearch = useCallback(
    async (value: string) => {
      setKeyword(value)
      await performSearch(value)
    },
    [performSearch],
  )

  const handleBlur = useCallback(() => {
    if (typeof window === 'undefined') {
      clearResults()
      return
    }

    window.setTimeout(() => {
      clearResults()
    }, 120)
  }, [clearResults])

  const handleSelect = useCallback(
    (value: string) => {
      const target = results.find((item) => item.value === value)
      if (target) {
        jumpToResult(target)
      }
    },
    [jumpToResult, results],
  )

  const handleSubmit = useCallback(
    async (value: string) => {
      const normalizedKeyword = value.trim()
      if (!normalizedKeyword) {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
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
    },
    [clearResults, jumpToResult, performSearch],
  )

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
