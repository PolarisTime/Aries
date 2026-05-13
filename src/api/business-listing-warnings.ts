import { logger } from '@/utils/logger'
import { SOFT_WARN_ROW_THRESHOLD } from './business-listing-constants'
import { getUnsupportedFilterKeys } from './business-listing-filtering'

const REPORTED_CLIENT_FILTER_SIGNATURES = new Map<string, number>()
const CLIENT_FILTER_REPORT_INTERVAL_MS = 5 * 60 * 1000

export function resetReportedClientFilterSignatures() {
  REPORTED_CLIENT_FILTER_SIGNATURES.clear()
}

export function reportClientFilterFallback(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const unsupportedKeys = getUnsupportedFilterKeys(moduleKey, search)
  if (unsupportedKeys.length === 0) {
    return
  }

  const signature = `${moduleKey}:${unsupportedKeys.sort().join(',')}`
  const lastReported = REPORTED_CLIENT_FILTER_SIGNATURES.get(signature)
  if (
    lastReported &&
    Date.now() - lastReported < CLIENT_FILTER_REPORT_INTERVAL_MS
  ) {
    return
  }

  REPORTED_CLIENT_FILTER_SIGNATURES.set(signature, Date.now())
  const countSuffix = lastReported ? ' (recurring)' : ''
  logger.warn(
    `[business-api] ${moduleKey} fell back to client-side filtering for unsupported filters: ${unsupportedKeys.join(', ')}${countSuffix}`,
    '\nConsider adding these keys to module-contracts.ts nativeFilterKeys.',
  )

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('leo:client-filter-fallback', {
        detail: {
          moduleKey,
          unsupportedKeys,
          recurring: Boolean(lastReported),
        },
      }),
    )
  }
}

export function reportClientFilterTruncation(
  moduleKey: string,
  maxRows: number,
) {
  logger.error(
    `[business-api] ${moduleKey} client-filter hit the hard limit of ${maxRows} rows. ` +
      'Results are truncated. Add the filter keys to module-contracts.ts nativeFilterKeys to enable server-side filtering.',
  )
}

export function reportUnpaginatedRowFetch(moduleKey: string, rowCount: number) {
  if (rowCount <= SOFT_WARN_ROW_THRESHOLD) {
    return
  }

  logger.warn(
    `[business-api] ${moduleKey} listAllBusinessModuleRows fetched ${rowCount} rows without pagination. ` +
      'Consider adding a dedicated server-side endpoint for this use case to avoid browser performance issues.',
  )
}
