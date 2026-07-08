import { normalizeRows } from '@/api/business-normalizers'
import { assertApiSuccess, http } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse, TableResponse } from '@/types/api'
import type { RawPagePayload, SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type PurchaseOrderImportCandidateUsage =
  | 'purchase-inbound'
  | 'sales-order'

export async function listPurchaseOrderImportCandidatePage(
  usage: PurchaseOrderImportCandidateUsage,
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.PURCHASE_ORDER_IMPORT_CANDIDATES,
      {
        params: {
          ...filters,
          keyword: asString(filters.keyword).trim(),
          usage,
          page,
          size,
        },
      },
    ),
    '查询采购订单导入候选失败',
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}
