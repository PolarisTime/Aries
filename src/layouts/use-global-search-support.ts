import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import {
  getBusinessModuleDetail,
  searchBusinessModule,
  searchGlobalBusiness,
  type GlobalBusinessSearchRecord,
} from '@/api/business'
import { businessPageConfigs } from '@/config/business-pages'
import { getSearchableModuleKeys } from '@/config/page-registry'
import {
  buildGlobalSearchSummary,
  normalizeGlobalSearchResult,
  searchAccessibleModules,
  type GlobalSearchResult,
} from '@/layouts/global-search'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface GlobalSearchRouterLike {
  push: (location: { path: string; query: Record<string, string> }) => unknown
}

interface UseGlobalSearchSupportOptions {
  router: GlobalSearchRouterLike
  canAccessModule: (moduleKey: string) => boolean
  moduleKeys?: string[]
  pageConfigs?: Record<string, ModulePageConfig>
  searchAllModules?: (
    keyword: string,
    moduleKeys: string[],
    signal?: AbortSignal,
  ) => Promise<GlobalBusinessSearchRecord[]>
  searchModule?: (moduleKey: string, keyword: string) => Promise<ModuleRecord[]>
  lookupRecordById?: (moduleKey: string, id: string) => Promise<ModuleRecord | null>
  buildSummary?: (record: ModuleRecord) => string
}

const GLOBAL_SEARCH_RESULT_LIMIT = 6
const GLOBAL_SEARCH_TOTAL_LIMIT = 20
const GLOBAL_SEARCH_DEBOUNCE_MS = 220

function isCanceledRequestError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }
  const record = error as Record<string, unknown>
  return (
    record.code === 'ERR_CANCELED'
    || record.name === 'CanceledError'
    || record.name === 'AbortError'
  )
}

export function useGlobalSearchSupport(options: UseGlobalSearchSupportOptions) {
  const keyword = ref('')
  const loading = ref(false)
  const results = ref<GlobalSearchResult[]>([])
  const resultOptions = computed(() =>
    results.value.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  )
  let requestId = 0
  let searchTimer: ReturnType<typeof window.setTimeout> | null = null
  let activeSearchController: AbortController | null = null

  function cancelPendingSearch(invalidateRequest = false) {
    if (searchTimer !== null) {
      window.clearTimeout(searchTimer)
      searchTimer = null
    }
    if (activeSearchController) {
      activeSearchController.abort()
      activeSearchController = null
    }
    if (invalidateRequest) {
      requestId += 1
      loading.value = false
    }
  }

  function clearResults() {
    cancelPendingSearch(true)
    results.value = []
  }

  async function performSearch(rawKeyword: string) {
    const normalizedKeyword = rawKeyword.trim()
    if (!normalizedKeyword) {
      clearResults()
      return []
    }

    const currentRequestId = ++requestId
    loading.value = true
    let searchController: AbortController | null = null

    try {
      if (currentRequestId !== requestId) {
        return []
      }

      const pageConfigs = options.pageConfigs || businessPageConfigs
      const moduleKeys = options.moduleKeys || getSearchableModuleKeys()
      const shouldUseAggregatedSearch =
        Boolean(options.searchAllModules) || (!options.searchModule && !options.lookupRecordById)
      searchController = shouldUseAggregatedSearch ? new AbortController() : null
      if (searchController) {
        activeSearchController = searchController
      }
      const merged =
        shouldUseAggregatedSearch
          ? (await (options.searchAllModules ||
              ((keyword: string, moduleKeys: string[]) =>
                searchGlobalBusiness(
                  keyword,
                  GLOBAL_SEARCH_TOTAL_LIMIT,
                  moduleKeys,
                  searchController?.signal,
                )))(
              normalizedKeyword,
              moduleKeys,
              searchController?.signal,
            ))
              .filter(
                (item) =>
                  moduleKeys.includes(item.moduleKey) &&
                  options.canAccessModule(item.moduleKey),
              )
              .map((item) =>
                normalizeGlobalSearchResult({
                  ...item,
                  title:
                    item.title ||
                    pageConfigs[item.moduleKey]?.title ||
                    item.moduleKey,
                }),
              )
          : await searchAccessibleModules({
              keyword: normalizedKeyword,
              moduleKeys,
              pageConfigs,
              canAccessModule: options.canAccessModule,
              searchModule:
                options.searchModule ||
                ((moduleKey, keyword) =>
                  searchBusinessModule(moduleKey, keyword, GLOBAL_SEARCH_RESULT_LIMIT)),
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

      if (currentRequestId !== requestId) {
        return []
      }

      results.value = merged
      return merged
    } catch (error) {
      if (isCanceledRequestError(error)) {
        return []
      }
      throw error
    } finally {
      if (activeSearchController === searchController) {
        activeSearchController = null
      }
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  async function performSearchSafely(rawKeyword: string) {
    try {
      return await performSearch(rawKeyword)
    } catch (error) {
      if (!isCanceledRequestError(error)) {
        console.error('[global-search] search failed', error)
      }
      return []
    }
  }

  function jumpToResult(result: GlobalSearchResult) {
    clearResults()
    const query: Record<string, string> = {
      docNo: result.primaryNo,
      openDetail: '1',
    }
    if (result.trackId) {
      query.trackId = result.trackId
    }
    void options.router.push({
      path: `/${result.moduleKey}`,
      query,
    })
  }

  async function handleSearch(value: string) {
    keyword.value = value
    cancelPendingSearch(true)
    if (!value.trim()) {
      results.value = []
      return
    }
    searchTimer = window.setTimeout(() => {
      searchTimer = null
      void performSearchSafely(value)
    }, GLOBAL_SEARCH_DEBOUNCE_MS)
  }

  function handleBlur() {
    if (typeof window === 'undefined') {
      clearResults()
      return
    }

    window.setTimeout(() => {
      clearResults()
    }, 120)
  }

  function handleSelect(value: unknown) {
    const normalizedValue =
      value && typeof value === 'object' && 'value' in value
        ? String((value as { value?: unknown }).value || '')
        : String(value || '')
    const target = results.value.find((item) => item.value === normalizedValue)
    if (target) {
      jumpToResult(target)
    }
  }

  async function handleSubmit(value: string) {
    const normalizedKeyword = value.trim()
    if (!normalizedKeyword) {
      clearResults()
      return
    }

    cancelPendingSearch(true)
    const matchedResults = await performSearchSafely(normalizedKeyword)
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
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      cancelPendingSearch(true)
    })
  }

  return {
    keyword,
    loading,
    results,
    resultOptions,
    clearResults,
    handleBlur,
    handleSearch,
    handleSelect,
    handleSubmit,
    jumpToResult,
    performSearch,
  }
}
