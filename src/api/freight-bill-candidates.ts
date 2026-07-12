import { normalizeRows } from '@/api/business-normalizers'
import { assertApiSuccess, http } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse, TableResponse } from '@/types/api'
import type { RawPagePayload, SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export async function listFreightBillImportCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const { currentRecordId, ...candidateFilters } = filters
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.FREIGHT_BILL_IMPORT_CANDIDATES,
      {
        params: {
          ...candidateFilters,
          ...(currentRecordId == null
            ? {}
            : { currentBillId: currentRecordId }),
          keyword: asString(filters.keyword).trim(),
          page,
          size,
        },
      },
    ),
    '查询物流单导入候选失败',
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}
