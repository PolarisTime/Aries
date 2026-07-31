import { fetchCandidatePage } from '@/api/business/candidate-page'
import { ENDPOINTS } from '@/constants/endpoints'
import { purchaseOrderImportCandidatePageResponseSchema } from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

export async function listPurchaseOrderInboundImportCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  return fetchCandidatePage(
    ENDPOINTS.PURCHASE_ORDER_INBOUND_IMPORT_CANDIDATES,
    purchaseOrderImportCandidatePageResponseSchema,
    filters,
    page,
    size,
    signal,
  )
}
