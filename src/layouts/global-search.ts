import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

export interface GlobalSearchResult {
  value: string
  label: string
  moduleKey: string
  title: string
  primaryNo: string
  summary: string
}

interface ModuleSearchResponse {
  data?: {
    rows?: ModuleRecord[]
  }
}

interface AccessibleGlobalSearchOptions {
  keyword: string
  moduleKeys: string[]
  pageConfigs: Record<string, ModulePageConfig>
  canAccessModule: (moduleKey: string) => boolean
  searchModule: (moduleKey: string, keyword: string) => Promise<ModuleSearchResponse>
  buildSummary: (record: ModuleRecord) => string
}

export function buildGlobalSearchSummary(record: ModuleRecord) {
  return [
    record.customerName,
    record.supplierName,
    record.projectName,
    record.carrierName,
    record.status,
  ]
    .filter(Boolean)
    .map((item) => String(item))
    .slice(0, 3)
    .join(' / ')
}

export async function searchAccessibleModules(options: AccessibleGlobalSearchOptions) {
  const normalizedKeyword = options.keyword.trim()
  if (!normalizedKeyword) {
    return []
  }

  const accessibleModuleKeys = options.moduleKeys.filter((moduleKey) => options.canAccessModule(moduleKey))
  const responseList = await Promise.all(
    accessibleModuleKeys.map(async (moduleKey) => {
      try {
        const config = options.pageConfigs[moduleKey]
        const response = await options.searchModule(moduleKey, normalizedKeyword)
        const rows = response.data?.rows || []

        return rows.map((record) => {
          const primaryNo = String(record[config.primaryNoKey || 'id'] || record.id)
          const summary = options.buildSummary(record)

          return {
            value: `${moduleKey}::${primaryNo}`,
            label: `${config.title} | ${primaryNo}${summary ? ` | ${summary}` : ''}`,
            moduleKey,
            title: config.title,
            primaryNo,
            summary,
          } satisfies GlobalSearchResult
        })
      } catch {
        return []
      }
    }),
  )

  return responseList
    .flat()
    .sort((left, right) => left.primaryNo.localeCompare(right.primaryNo))
    .slice(0, 20)
}
