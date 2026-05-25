import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { GlobalSearchResult } from '@/layouts/global-search'
import { asString } from '@/utils/type-narrowing'

interface GlobalSearchResponse {
  moduleKey?: string
  title?: string
  trackId?: string | number
  primaryNo?: string | number
  summary?: string
  matchedByTrackId?: boolean
}

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
    await http.get<ApiResponse<GlobalSearchResponse[]>>(ENDPOINTS.GLOBAL_SEARCH, {
      signal,
      params: {
        keyword,
        limit: 20,
        moduleKeys: moduleKeys.join(','),
      },
    }),
    '全局搜索失败',
  )

  return (response.data || [])
    .map(toGlobalSearchResult)
    .filter((item) => item.moduleKey && (item.trackId || item.primaryNo))
}
