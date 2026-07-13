import { normalizeRows } from '@/api/business-normalizers'
import { assertApiSuccess, http } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse, TableResponse } from '@/types/api'
import type { RawPagePayload, SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

async function listInvoiceSourceCandidatePage(
  endpoint: string,
  errorMessage: string,
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(endpoint, {
      params: {
        ...filters,
        keyword: asString(filters.keyword).trim(),
        page,
        size,
      },
    }),
    errorMessage,
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}

export function listInvoiceIssueSourceCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
) {
  return listInvoiceSourceCandidatePage(
    ENDPOINTS.INVOICE_ISSUE_SOURCE_CANDIDATES,
    '查询开票来源候选失败',
    filters,
    page,
    size,
  )
}

export function listInvoiceReceiptSourceCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
) {
  return listInvoiceSourceCandidatePage(
    ENDPOINTS.INVOICE_RECEIPT_SOURCE_CANDIDATES,
    '查询收票来源候选失败',
    filters,
    page,
    size,
  )
}
