import { normalizeRows } from '@/api/business-normalizers'
import { apiGet, assertApiSuccess } from '@/api/client'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import { ENDPOINTS } from '@/constants/endpoints'
import { HTTP_STATUS } from '@/constants/http-status'
import { rawPageResponseSchema } from '@/shared/schemas/api'
import type { TableResponse } from '@/types/api'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { readRequestError } from './request-errors'

async function requestInboundImportCandidatePage(
  endpoint: string,
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
  suppressGlobalErrorStatuses?: readonly number[],
) {
  return apiGet(endpoint, rawPageResponseSchema, {
    params: {
      ...filters,
      keyword: asString(filters.keyword).trim(),
      page,
      size,
    },
    signal,
    suppressGlobalErrorStatuses,
  })
}

export async function listPurchaseOrderInboundImportCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<TableResponse<ModuleRecord>> {
  let rawResponse: Awaited<ReturnType<typeof requestInboundImportCandidatePage>>
  try {
    rawResponse = await requestInboundImportCandidatePage(
      ENDPOINTS.PURCHASE_ORDER_INBOUND_IMPORT_CANDIDATES,
      filters,
      page,
      size,
      signal,
      [HTTP_STATUS.NOT_FOUND],
    )
  } catch (error) {
    if (readRequestError(error).status !== HTTP_STATUS.NOT_FOUND) {
      throw error
    }
    rawResponse = await requestInboundImportCandidatePage(
      ENDPOINTS.PURCHASE_ORDER_IMPORT_CANDIDATES_LEGACY,
      { ...filters, usage: 'purchase-inbound' },
      page,
      size,
      signal,
    )
  }

  const response = assertApiSuccess(rawResponse, '查询采购订单导入候选失败')

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}
