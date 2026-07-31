import { z } from 'zod'
import { fetchBusinessSummary } from '@/api/business/business-summary'
import { ENDPOINTS } from '@/constants/endpoints'
import { responseNonNegativeIntegerSchema } from '@/shared/schemas/api'
import type { SearchParams } from '@/types/api-raw'

const MODULE_KEY = 'freight-statement'

const freightStatementSummarySchema = z.strictObject({
  documentCount: responseNonNegativeIntegerSchema,
  totalWeight: z.number(),
  totalFreight: z.number(),
  paidAmount: z.number(),
  unpaidAmount: z.number(),
})

const freightStatementSummaryResponseSchema = freightStatementSummarySchema

export type FreightStatementSummary = z.output<
  typeof freightStatementSummarySchema
>

export async function fetchFreightStatementSummary(search: SearchParams) {
  return fetchBusinessSummary(
    MODULE_KEY,
    ENDPOINTS.FREIGHT_STATEMENTS_SUMMARY,
    freightStatementSummaryResponseSchema,
    search,
  )
}
