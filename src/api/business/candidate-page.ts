import type { ZodType } from 'zod'
import { apiGet } from '@/api/core/client'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import { asString } from '@/utils/type-narrowing'

type CandidatePagePayload<Row> = {
  content: Row[]
  totalElements: number
}

export async function fetchCandidatePage<Row>(
  endpoint: string,
  responseSchema: ZodType<CandidatePagePayload<Row>>,
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<Row>> {
  const response = await apiGet(endpoint, responseSchema, {
    params: {
      ...filters,
      keyword: asString(filters.keyword).trim(),
      page,
      size,
    },
    signal,
  })

  return {
    code: 0,
    data: {
      rows: response.content,
      total: response.totalElements,
    },
  }
}
