import { z } from 'zod'
import {
  buildFilterParams,
  getUnsupportedFilterKeys,
} from '@/api/business/business-listing-filtering'
import { apiGet, assertApiSuccess } from '@/api/core/client'
import {
  apiResponseSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'
import type { SearchParams } from '@/types/api-raw'

const MODULE_KEY = 'customer-statement'

const customerStatementSummarySchema = z.strictObject({
  documentCount: responseNonNegativeIntegerSchema,
  salesAmount: z.number(),
  receiptAmount: z.number(),
  closingAmount: z.number(),
})

const customerStatementSummaryResponseSchema = apiResponseSchema(
  customerStatementSummarySchema,
)

export type CustomerStatementSummary = z.output<
  typeof customerStatementSummarySchema
>

export async function fetchCustomerStatementSummary(search: SearchParams) {
  const unsupportedKeys = getUnsupportedFilterKeys(MODULE_KEY, search)
  if (unsupportedKeys.length) {
    throw new Error(
      `${MODULE_KEY} 不支持服务端过滤字段：${unsupportedKeys.join(', ')}`,
    )
  }

  const response = assertApiSuccess(
    await apiGet(
      '/customer-statements/summary',
      customerStatementSummaryResponseSchema,
      {
        params: buildFilterParams(MODULE_KEY, search),
      },
    ),
    '查询客户对账汇总失败',
  )
  return response.data
}
