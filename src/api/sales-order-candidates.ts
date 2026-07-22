import { normalizeRows } from '@/api/business-normalizers'
import { apiGet, assertApiSuccess } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { rawPageResponseSchema } from '@/shared/schemas/api'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export async function listSalesOrderOutboundImportCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await apiGet(
      ENDPOINTS.SALES_ORDER_OUTBOUND_IMPORT_CANDIDATES,
      rawPageResponseSchema,
      {
        params: {
          ...filters,
          keyword: asString(filters.keyword).trim(),
          page,
          size,
        },
        signal,
      },
    ),
    '查询销售订单出库导入候选失败',
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}

export async function listSalesOrderPurchaseSourceCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  const { currentSalesOrderId, ...candidateFilters } = filters
  const response = assertApiSuccess(
    await apiGet(
      ENDPOINTS.SALES_ORDER_PURCHASE_SOURCE_CANDIDATES,
      rawPageResponseSchema,
      {
        params: {
          ...candidateFilters,
          currentSalesOrderId,
          keyword: asString(filters.keyword).trim(),
          page,
          size,
        },
        signal,
      },
    ),
    '查询销售订单采购来源候选失败',
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}
