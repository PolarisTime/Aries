import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

export interface GlobalSearchResult {
  value: string
  label: string
  moduleKey: string
  title: string
  trackId: string
  primaryNo: string
  summary: string
  matchedByTrackId: boolean
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
  lookupRecordById?: (moduleKey: string, id: string) => Promise<ModuleRecord | null>
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

function isLikelyTrackId(value: string) {
  return /^\d{12,}$/.test(value.trim())
}

function buildGlobalSearchResult(
  moduleKey: string,
  config: ModulePageConfig,
  record: ModuleRecord,
  keyword: string,
  buildSummary: (record: ModuleRecord) => string,
) {
  const trackId = String(record.id || '')
  const primaryNo = String(record[config.primaryNoKey || 'id'] || record.id)
  const summary = buildSummary(record)
  const matchedByTrackId = Boolean(trackId && trackId === keyword)
  const idText = matchedByTrackId && trackId !== primaryNo ? ` | ID ${trackId}` : ''

  return {
    value: `${moduleKey}::${primaryNo || trackId}`,
    label: `${config.title} | ${primaryNo}${idText}${summary ? ` | ${summary}` : ''}`,
    moduleKey,
    title: config.title,
    trackId,
    primaryNo,
    summary,
    matchedByTrackId,
  } satisfies GlobalSearchResult
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
        if (!config) {
          return []
        }

        const rows: ModuleRecord[] = []
        try {
          const response = await options.searchModule(moduleKey, normalizedKeyword)
          rows.push(...(response.data?.rows || []))
        } catch {
          // A failed keyword search should not block direct trackId lookup below.
        }

        if (options.lookupRecordById && isLikelyTrackId(normalizedKeyword)) {
          try {
            const record = await options.lookupRecordById(moduleKey, normalizedKeyword)
            if (record) {
              rows.push(record)
            }
          } catch {
            // A snowflake id belongs to at most one module; misses in other modules are expected.
          }
        }

        const seenKeys = new Set<string>()
        return rows
          .filter((record) => {
            const key = String(record.id || record[config.primaryNoKey || 'id'] || '')
            if (!key || seenKeys.has(key)) {
              return false
            }
            seenKeys.add(key)
            return true
          })
          .map((record) =>
            buildGlobalSearchResult(
              moduleKey,
              config,
              record,
              normalizedKeyword,
              options.buildSummary,
            ),
          )
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
