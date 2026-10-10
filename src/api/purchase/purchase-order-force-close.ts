import { apiDeleteNoContent, apiPost } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { mainFlowDetailResponseSchemas } from '@/shared/schemas/module-record'
import type { MainFlowDetailRecord } from '@/types/module-record'

const purchaseOrderDetailResponseSchema =
  mainFlowDetailResponseSchemas['purchase-order']

/**
 * 强制结单：把「已审核」采购订单的剩余未入库件数一次性作废，并置为「完成采购」。
 * <p>原因必填（后端留痕：谁、何时、为什么把剩余量作废）。</p>
 */
export async function forceClosePurchaseOrder(
  id: string,
  reason: string,
): Promise<MainFlowDetailRecord<'purchase-order'>> {
  return apiPost(
    ENDPOINTS.PURCHASE_ORDER_FORCE_CLOSURES(id),
    purchaseOrderDetailResponseSchema,
    { reason },
    withIdempotencyKey(),
  )
}

/** 撤销强制结单：退回「已审核」并清空留痕，未入库件数重新可入库。 */
export async function cancelPurchaseOrderForceClose(id: string): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.PURCHASE_ORDER_FORCE_CLOSURES(id),
    withIdempotencyKey(),
  )
}
