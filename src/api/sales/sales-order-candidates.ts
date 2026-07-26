import { apiGet, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  salesOrderOutboundCandidatePageResponseSchema,
  salesOrderSourceCandidatePageResponseSchema,
} from '@/shared/schemas/module-record'
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
      salesOrderOutboundCandidatePageResponseSchema,
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
      rows: response.data.content,
      total: response.data.totalElements,
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
      salesOrderSourceCandidatePageResponseSchema,
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
      rows: response.data.content,
      total: response.data.totalElements,
    },
  }
}
