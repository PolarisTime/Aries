import { useRef, useState } from 'react'
import { searchGlobalDocuments } from '@/api/global-search'
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

  const clearResults = () => {
    setResults([])
  }

  const performSearch = async (rawKeyword: string) => {
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
      const moduleKeys = options.moduleKeys || getSearchableModuleKeys()
      const accessibleModuleKeys = moduleKeys.filter(options.canAccessModule)
      const merged =
        options.searchModule || options.lookupRecordById
          ? await searchAccessibleModules({
              keyword: normalizedKeyword,
              moduleKeys,
              pageConfigs: options.pageConfigs || modulePageMetaMap,
              canAccessModule: options.canAccessModule,
              searchModule:
                options.searchModule ||
                (() => Promise.resolve({ data: { rows: [] } })),
              lookupRecordById: options.lookupRecordById,
              buildSummary: options.buildSummary || buildGlobalSearchSummary,
            })
          : await searchGlobalDocuments(
              normalizedKeyword,
              accessibleModuleKeys,
              controller.signal,
            )

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
  }

  const jumpToResult = (result: GlobalSearchResult) => {
    clearResults()
    options.onJump(result)
  }

  const handleSearch = async (value: string) => {
    setKeyword(value)
    await performSearch(value)
  }

  const handleBlur = () => {
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
