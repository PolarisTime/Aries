import { computed, ref } from 'vue'
import { getBusinessModuleDetail, listBusinessModule } from '@/api/business'
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

interface GlobalSearchRouterLike {
  push: (location: { path: string; query: Record<string, string> }) => unknown
}

interface UseGlobalSearchSupportOptions {
  router: GlobalSearchRouterLike
  canAccessModule: (moduleKey: string) => boolean
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

  function clearResults() {
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

    try {
      if (currentRequestId !== requestId) {
        return []
      }

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

      if (currentRequestId !== requestId) {
        return []
      }

      results.value = merged
      return merged
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
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
    await performSearch(value)
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
