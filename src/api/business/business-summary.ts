import type { output, ZodType } from 'zod'
import {
  buildFilterParams,
  getUnsupportedFilterKeys,
} from '@/api/business/business-listing-filtering'
import { apiGet } from '@/api/core/client'
import type { SearchParams } from '@/types/api-raw'

export function fetchBusinessSummary<Schema extends ZodType>(
  moduleKey: string,
  endpoint: string,
  responseSchema: Schema,
  search: SearchParams,
): Promise<output<Schema>> {
  const unsupportedKeys = getUnsupportedFilterKeys(moduleKey, search)
  if (unsupportedKeys.length) {
    throw new Error(
      `${moduleKey} 不支持服务端过滤字段：${unsupportedKeys.join(', ')}`,
    )
  }

  return apiGet(endpoint, responseSchema, {
    params: buildFilterParams(moduleKey, search),
  })
}
