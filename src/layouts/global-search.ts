import { uniqBy } from 'es-toolkit'
import type { ModulePageMeta } from '@/config/module-page-meta'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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
  pageConfigs: Record<string, ModulePageMeta>
  canAccessModule: (moduleKey: string) => boolean
  searchModule: (
    moduleKey: string,
    keyword: string,
    // biome-ignore lint/suspicious/noExplicitAny: in-progress type migration
  ) => Promise<any>
  lookupRecordById?: (
    moduleKey: string,
    id: string,
  ) => Promise<ModuleRecord | null>
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
  const idText =
    matchedByTrackId && trackId !== primaryNo ? ` | ID ${trackId}` : ''

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
  config: ModulePageMeta,
  record: ModuleRecord,
  keyword: string,
  buildSummary: (record: ModuleRecord) => string,
) {
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

export async function searchAccessibleModules(
  options: AccessibleGlobalSearchOptions,
) {
  const normalizedKeyword = options.keyword.trim()
  if (!normalizedKeyword) {
    return []
  }

  const accessibleModuleKeys = options.moduleKeys.filter((moduleKey) =>
    options.canAccessModule(moduleKey),
  )
  const responseList = await Promise.all(
    accessibleModuleKeys.map(async (moduleKey) => {
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
          // A failed keyword search should not block direct trackId lookup below.
        }

        // TODO: re-enable lookupRecordById when trackId matching rules are finalized
        // if (options.lookupRecordById) {
        //   try {
        //     const record = await options.lookupRecordById(moduleKey, normalizedKeyword)
        //     if (record) rows.push(record)
        //   } catch {
        //     // A snowflake id belongs to at most one module; misses in other modules are expected.
        //   }
        // }

        const deduped = uniqBy(
          rows.filter((record) => {
            const key = String(
              record.id || asString(record[config.primaryNoKey || 'id']),
            )
            return Boolean(key)
          }),
          (record) =>
            String(record.id || asString(record[config.primaryNoKey || 'id'])),
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
