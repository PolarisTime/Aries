import { uniqBy } from 'es-toolkit'
import type { ModulePageMeta } from '@/config/module-page-meta'
import type {
  GlobalSearchResult,
  ModuleSearchResponse,
} from '@/types/global-search'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface GlobalSearchOptions {
  keyword: string
  moduleKeys: string[]
  pageConfigs: Record<string, ModulePageMeta>
  searchModule: (
    moduleKey: string,
    keyword: string,
  ) => Promise<ModuleSearchResponse>
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

function buildGlobalSearchResult(
  moduleKey: string,
  config: ModulePageMeta,
  record: ModuleRecord,
  keyword: string,
  buildSummary: (record: ModuleRecord) => string,
): GlobalSearchResult {
  const trackId = String(record.id || '')
  const primaryNo = String(record[config.primaryNoKey || 'id'] || record.id)
  const summary = buildSummary(record)
  const matchedByTrackId = Boolean(trackId && trackId === keyword)
  const idText =
    matchedByTrackId && trackId !== primaryNo ? ` | ID ${trackId}` : ''

  return {
    value: `${moduleKey}::${trackId || primaryNo}`,
    label: `${config.title} | ${primaryNo}${idText}${summary ? ` | ${summary}` : ''}`,
    moduleKey,
    title: config.title,
    trackId: String(record.id || ''),
    primaryNo: String(record[config.primaryNoKey || 'id'] || record.id),
    summary: buildSummary(record),
    matchedByTrackId: Boolean(record.id && String(record.id) === keyword),
  }
}

function getGlobalSearchRecordKey(record: ModuleRecord, primaryNoKey?: string) {
  return String(record.id || asString(record[primaryNoKey || 'id']))
}

export async function searchModules(options: GlobalSearchOptions) {
  const normalizedKeyword = options.keyword.trim()
  if (!normalizedKeyword) {
    return []
  }

  const responseList = await Promise.all(
    options.moduleKeys.map(async (moduleKey) => {
      try {
        const config = options.pageConfigs[moduleKey]
        if (!config) {
          return []
        }

        const rows: ModuleRecord[] = []
        try {
          const response = await options.searchModule(
            moduleKey,
            normalizedKeyword,
          )
          rows.push(...(response.data?.rows || []))
        } catch {
          // A failed module search should not block results from other modules.
        }

        const deduped = uniqBy(
          rows.filter((record) => {
            const key = getGlobalSearchRecordKey(record, config.primaryNoKey)
            return Boolean(key)
          }),
          (record) => getGlobalSearchRecordKey(record, config.primaryNoKey),
        )
        return deduped.map((record) =>
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
