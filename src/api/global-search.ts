import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'
import type { GlobalSearchResult } from '@/types/global-search'
import { asString } from '@/utils/type-narrowing'

export interface GlobalSearchResponse {
  moduleKey?: string
  title?: string
  trackId?: string | number
  primaryNo?: string | number
  summary?: string
  matchedByTrackId?: boolean
}

const globalSearchResponseSchema = apiResponseSchema(
  z.array(
    z.object({
      moduleKey: z.string().optional(),
      title: z.string().optional(),
      trackId: z.union([z.string(), z.number()]).optional(),
      primaryNo: z.union([z.string(), z.number()]).optional(),
      summary: z.string().optional(),
      matchedByTrackId: z.boolean().optional(),
    }),
  ),
)

function toGlobalSearchResult(item: GlobalSearchResponse): GlobalSearchResult {
  const moduleKey = asString(item.moduleKey)
  const trackId = asString(item.trackId)
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
  const response = assertApiSuccess(
    await apiGet(ENDPOINTS.GLOBAL_SEARCH, globalSearchResponseSchema, {
      signal,
      params: {
        keyword,
        limit: 20,
        moduleKeys: moduleKeys.join(','),
      },
    }),
    '全局搜索失败',
  )

  return (response.data || []).flatMap((rawItem) => {
    const item = toGlobalSearchResult(rawItem)
    return item.moduleKey && (item.trackId || item.primaryNo) ? [item] : []
  })
}
