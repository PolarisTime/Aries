import { apiGet, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { freightSalesOrderCandidatePageResponseSchema } from '@/shared/schemas/module-record'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export async function listFreightSalesOrderCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await apiGet(
      ENDPOINTS.FREIGHT_BILL_SALES_ORDER_CANDIDATES,
      freightSalesOrderCandidatePageResponseSchema,
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
    '查询物流单销售订单来源失败',
  )

  return {
    code: 0,
    data: {
      rows: response.data.content,
      total: response.data.totalElements,
    },
  }
}
