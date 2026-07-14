import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import type { ApiResponse } from '@/types/api'
import type { EntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'

interface PurchaseOrderCompletionResult {
  purchaseOrderId: string | number
  purchaseOrderNo: string
  status: string
}

interface SalesOutboundCommandResult {
  id: string | number
  outboundNo: string
  status: string
}

export interface PurchaseInboundAuditCommandInput {
  overToleranceConfirmations: Array<{
    inboundItemId: EntityId
    reasonCode: string
    remark?: string
  }>
}

export interface PurchaseInboundAuditCommandResult {
  purchaseInbound: ModuleRecord
}

export interface PurchaseInboundSplitPreviewResult {
  sourcePurchaseOrderId: string | number
  sourcePurchaseOrderNo: string
  importAllowed: boolean
  blockingReason?: string | null
  expectedDraftCount: number
  groups: Array<{
    warehouseId: string | number
    warehouseName: string
    settlementMode: string
    totalQuantity: number
    totalTheoreticalWeightTon: number
    totalAmount: number
    items: Array<{ sourcePurchaseOrderItemId: string | number }>
  }>
}

export interface PurchaseInboundImportBatchResult {
  id: string | number
  batchNo: string
  sourcePurchaseOrderId: string | number
  sourcePurchaseOrderNo: string
  inbounds: Array<{
    id: string | number
    inboundNo: string
    warehouseId: string | number
    warehouseName: string
    settlementMode: string
    itemCount: number
    status: string
  }>
}

export async function completePurchaseOrder(id: string) {
  return assertApiSuccess(
    await http.post<ApiResponse<PurchaseOrderCompletionResult>>(
      `/purchase-orders/${encodeURIComponent(id)}/complete`,
      null,
      withIdempotencyKey(),
    ),
    '完成采购失败',
  )
}

export async function reopenPurchaseOrder(id: string) {
  return assertApiSuccess(
    await http.post<ApiResponse<unknown>>(
      `/purchase-orders/${encodeURIComponent(id)}/reopen`,
      null,
      withIdempotencyKey(),
    ),
    '撤销完成采购失败',
  )
}

export async function auditPurchaseInbound(
  id: string,
  input: PurchaseInboundAuditCommandInput,
) {
  return assertApiSuccess(
    await http.post<ApiResponse<PurchaseInboundAuditCommandResult>>(
      `/purchase-inbounds/${encodeURIComponent(id)}/audit`,
      input,
      withIdempotencyKey(),
    ),
    '审核采购入库失败',
  )
}

export async function completeSalesOrder(id: string) {
  return assertApiSuccess(
    await http.post<ApiResponse<unknown>>(
      `/sales-orders/${encodeURIComponent(id)}/complete`,
      null,
      withIdempotencyKey(),
    ),
    '完成销售失败',
  )
}

export async function previewPurchaseInboundSplit(id: string) {
  return assertApiSuccess(
    await http.get<ApiResponse<PurchaseInboundSplitPreviewResult>>(
      `/purchase-orders/${encodeURIComponent(id)}/inbound-split-preview`,
    ),
    '采购入库拆分预览失败',
  )
}

export async function createPurchaseInboundImportBatch(
  id: string,
  input: { inboundDate: string; remark?: string },
) {
  return assertApiSuccess(
    await http.post<ApiResponse<PurchaseInboundImportBatchResult>>(
      `/purchase-orders/${encodeURIComponent(id)}/inbound-import-batches`,
      input,
      withIdempotencyKey(),
    ),
    '采购入库拆分草稿创建失败',
  )
}

export async function createSalesOutboundFromFreightBill(id: string) {
  return assertApiSuccess(
    await http.post<ApiResponse<SalesOutboundCommandResult>>(
      `/freight-bills/${encodeURIComponent(id)}/sales-outbound`,
      null,
      withIdempotencyKey(),
    ),
    '生成销售出库失败',
  )
}
