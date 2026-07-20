import { normalizeRows } from '@/api/business-normalizers'
import { assertApiSuccess, http } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse, TableResponse } from '@/types/api'
import type { RawPagePayload, SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export async function listFreightSalesOrderCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.FREIGHT_BILL_SALES_ORDER_CANDIDATES,
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
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}
