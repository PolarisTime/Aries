import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { GlobalSearchResult } from '@/types/global-search'
import { asString } from '@/utils/type-narrowing'

export interface GlobalSearchResponse {
  moduleKey?: string
  title?: string
  trackId?: string
  primaryNo?: string
  summary?: string
  matchedByTrackId?: boolean
}

const globalSearchResponseSchema = z.array(
  z.object({
    moduleKey: z.string().optional(),
    title: z.string().optional(),
    trackId: z.string().optional(),
    primaryNo: z.string().optional(),
    summary: z.string().optional(),
    matchedByTrackId: z.boolean().optional(),
  }),
)

function toGlobalSearchResult(item: GlobalSearchResponse): GlobalSearchResult {
  const moduleKey = asString(item.moduleKey)
  const trackId =
    parseOptionalEntityId(item.trackId, 'globalSearch.trackId') || ''
  const primaryNo = asString(item.primaryNo || item.trackId)
  const title = asString(item.title || moduleKey)
  const summary = asString(item.summary)
  const idText =
    item.matchedByTrackId && trackId && trackId !== primaryNo
      ? ` | ID ${trackId}`
      : ''

  return {
    value: `${moduleKey}::${trackId || primaryNo}`,
    label: `${title} | ${primaryNo}${idText}${summary ? ` | ${summary}` : ''}`,
    moduleKey,
    title,
    trackId,
    primaryNo,
    summary,
    matchedByTrackId: Boolean(item.matchedByTrackId),
  }
}

export async function searchGlobalDocuments(
  keyword: string,
  moduleKeys: string[],
  signal?: AbortSignal,
): Promise<GlobalSearchResult[]> {
  const response = await apiGet(
    ENDPOINTS.GLOBAL_SEARCH,
    globalSearchResponseSchema,
    {
      signal,
      params: {
        keyword,
        limit: 20,
        moduleKeys: moduleKeys.join(','),
      },
    },
  )

  return response.flatMap((rawItem) => {
    const item = toGlobalSearchResult(rawItem)
    return item.moduleKey && (item.trackId || item.primaryNo) ? [item] : []
  })
}
