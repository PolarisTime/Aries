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

export interface GlobalSearchSourceRecord {
  moduleKey: string
  title: string
  trackId: string
  primaryNo: string
  summary: string
  matchedByTrackId: boolean
}

interface AccessibleGlobalSearchOptions {
  keyword: string
  moduleKeys: string[]
  pageConfigs: Record<string, ModulePageConfig>
  canAccessModule: (moduleKey: string) => boolean
  searchModule: (moduleKey: string, keyword: string) => Promise<ModuleRecord[]>
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

export function isLikelyTrackId(value: string) {
  return /^\d{12,}$/.test(value.trim())
}

export function normalizeGlobalSearchResult(source: GlobalSearchSourceRecord) {
  const primaryNo = String(source.primaryNo || source.trackId || '')
  const trackId = String(source.trackId || '')
  const summary = String(source.summary || '')
  const matchedByTrackId = Boolean(source.matchedByTrackId)
  const idText = matchedByTrackId && trackId !== primaryNo ? ` | ID ${trackId}` : ''

  return {
    value: `${source.moduleKey}::${primaryNo || trackId}`,
    label: `${source.title} | ${primaryNo}${idText}${summary ? ` | ${summary}` : ''}`,
    moduleKey: source.moduleKey,
    title: source.title,
    trackId,
    primaryNo,
    summary,
    matchedByTrackId,
  } satisfies GlobalSearchResult
}

function buildGlobalSearchResult(
  moduleKey: string,
  config: ModulePageConfig,
  record: ModuleRecord,
  keyword: string,
  buildSummary: (record: ModuleRecord) => string,
) {
  return normalizeGlobalSearchResult({
    moduleKey,
    title: config.title,
    trackId: String(record.id || ''),
    primaryNo: String(record[config.primaryNoKey || 'id'] || record.id),
    summary: buildSummary(record),
    matchedByTrackId: Boolean(record.id && String(record.id) === keyword),
  })
}

export async function searchAccessibleModules(options: AccessibleGlobalSearchOptions) {
  const normalizedKeyword = options.keyword.trim()
  if (!normalizedKeyword) {
    return []
  }

  const accessibleModuleKeys = options.moduleKeys.filter((moduleKey) => options.canAccessModule(moduleKey))
  const shouldLookupOnlyByTrackId = Boolean(
    options.lookupRecordById && isLikelyTrackId(normalizedKeyword),
  )
  const responseList = await Promise.all(
    accessibleModuleKeys.map(async (moduleKey) => {
      try {
        const config = options.pageConfigs[moduleKey]
        if (!config) {
          return []
        }

        const rows: ModuleRecord[] = []
        if (!shouldLookupOnlyByTrackId) {
          try {
            rows.push(...(await options.searchModule(moduleKey, normalizedKeyword)))
          } catch {
            // A failed keyword search should not block direct trackId lookup below.
          }
        }

        if (shouldLookupOnlyByTrackId && options.lookupRecordById) {
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
