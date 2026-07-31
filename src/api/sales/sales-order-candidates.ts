import { fetchCandidatePage } from '@/api/business/candidate-page'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  salesOrderOutboundCandidatePageResponseSchema,
  salesOrderSourceCandidatePageResponseSchema,
} from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

export async function listSalesOrderOutboundImportCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  return fetchCandidatePage(
    ENDPOINTS.SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES,
    salesOrderOutboundCandidatePageResponseSchema,
    filters,
    page,
    size,
    signal,
  )
}

export async function listSalesOrderPurchaseSourceCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  const { currentSalesOrderId, ...candidateFilters } = filters
  return fetchCandidatePage(
    ENDPOINTS.SALES_ORDER_PURCHASE_SOURCE_CANDIDATES,
    salesOrderSourceCandidatePageResponseSchema,
    { ...candidateFilters, currentSalesOrderId },
    page,
    size,
    signal,
  )
}
