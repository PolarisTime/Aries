import { normalizeRecord, normalizeRows } from '@/api/business-normalizers'
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

export async function listPurchaseOrderPrepaymentCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.PURCHASE_ORDER_PREPAYMENT_CANDIDATES,
      {
        params: {
          ...filters,
          keyword: asString(filters.keyword).trim(),
          page,
          size,
        },
      },
    ),
    '查询采购预付款来源候选失败',
  )

  return {
    code: 0,
    data: {
      rows: normalizeRows(pageContent(response.data)),
      total: pageTotalElements(response.data),
    },
  }
}

export async function listPurchaseRefundSourceCandidatePage(
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.PURCHASE_REFUND_SOURCE_CANDIDATES,
      {
        params: {
          ...filters,
          keyword: asString(filters.keyword).trim(),
          page,
          size,
        },
      },
    ),
    '查询采购退款来源候选失败',
  )
  const rows = normalizeRows(pageContent(response.data)).map((record) => ({
    ...record,
    purchaseOrderNo: asString(record.orderNo),
    importableQuantity: record.refundableQuantity,
    totalWeight: record.refundableWeight,
    totalAmount: record.refundableAmount,
  }))
  return {
    code: 0,
    data: {
      rows,
      total: pageTotalElements(response.data),
    },
  }
}

export async function getPurchaseRefundPreview(
  sourcePurchaseOrderId: string,
): Promise<ModuleRecord> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      ENDPOINTS.PURCHASE_REFUND_PREVIEW,
      { params: { sourcePurchaseOrderId } },
    ),
    '查询采购退款预览失败',
  )
  const raw = (response.data || {}) as Record<string, unknown>
  return normalizeRecord({
    ...raw,
    id: asString(raw.sourcePurchaseOrderId),
  })
}
