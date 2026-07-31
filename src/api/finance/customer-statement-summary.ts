import { z } from 'zod'
import { fetchBusinessSummary } from '@/api/business/business-summary'
import { ENDPOINTS } from '@/constants/endpoints'
import { responseNonNegativeIntegerSchema } from '@/shared/schemas/api'
import type { SearchParams } from '@/types/api-raw'

const MODULE_KEY = 'customer-statement'

const customerStatementSummarySchema = z.strictObject({
  documentCount: responseNonNegativeIntegerSchema,
  salesAmount: z.number(),
  receiptAmount: z.number(),
  closingAmount: z.number(),
})

const customerStatementSummaryResponseSchema = customerStatementSummarySchema

export type CustomerStatementSummary = z.output<
  typeof customerStatementSummarySchema
>

export async function fetchCustomerStatementSummary(search: SearchParams) {
  return fetchBusinessSummary(
    MODULE_KEY,
    ENDPOINTS.CUSTOMER_STATEMENTS_SUMMARY,
    customerStatementSummaryResponseSchema,
    search,
  )
}
