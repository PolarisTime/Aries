import { z } from 'zod'
import {
  buildFilterParams,
  getUnsupportedFilterKeys,
} from '@/api/business-listing-filtering'
import { apiGet, assertApiSuccess } from '@/api/client'
import {
  apiResponseSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'
import type { SearchParams } from '@/types/api-raw'

const MODULE_KEY = 'freight-statement'

const freightStatementSummarySchema = z.strictObject({
  documentCount: responseNonNegativeIntegerSchema,
  totalWeight: z.number(),
  totalFreight: z.number(),
  paidAmount: z.number(),
  unpaidAmount: z.number(),
})

const freightStatementSummaryResponseSchema = apiResponseSchema(
  freightStatementSummarySchema,
)

export type FreightStatementSummary = z.output<
  typeof freightStatementSummarySchema
>

export async function fetchFreightStatementSummary(search: SearchParams) {
  const unsupportedKeys = getUnsupportedFilterKeys(MODULE_KEY, search)
  if (unsupportedKeys.length) {
    throw new Error(
      `${MODULE_KEY} 不支持服务端过滤字段：${unsupportedKeys.join(', ')}`,
    )
  }

  const response = assertApiSuccess(
    await apiGet(
      '/freight-statements/summary',
      freightStatementSummaryResponseSchema,
      {
        params: buildFilterParams(MODULE_KEY, search),
      },
    ),
    '查询物流对账汇总失败',
  )
  return response.data
}
