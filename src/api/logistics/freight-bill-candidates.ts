import { fetchCandidatePage } from '@/api/business/candidate-page'
import { ENDPOINTS } from '@/constants/endpoints'
import { freightSalesOrderCandidatePageResponseSchema } from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

export async function listFreightSalesOrderCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  return fetchCandidatePage(
    ENDPOINTS.FREIGHT_BILL_SALES_ORDER_CANDIDATES,
    freightSalesOrderCandidatePageResponseSchema,
    filters,
    page,
    size,
    signal,
  )
}
