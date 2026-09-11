import { apiPost } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { toSaveRequest } from '@/module-system/record/module-save-payload'
import { mainFlowDetailResponseSchemas } from '@/shared/schemas/module-record'
import type {
  MainFlowDetailRecord,
  MainFlowEditorDraft,
} from '@/types/module-record'

const salesOrderDetailResponseSchema =
  mainFlowDetailResponseSchemas['sales-order']

export async function completeSalesOrder(
  id: string,
): Promise<MainFlowDetailRecord<'sales-order'>> {
  return apiPost(
    ENDPOINTS.SALES_ORDER_COMPLETIONS(id),
    salesOrderDetailResponseSchema,
    null,
    withIdempotencyKey(),
  )
}

export async function saveAndCompleteSalesOrder(
  record: MainFlowEditorDraft<'sales-order'>,
  idempotencyKey?: string,
): Promise<MainFlowDetailRecord<'sales-order'>> {
  const id = String(record.id || '').trim()
  if (!id) {
    throw new Error('销售订单 ID 不能为空')
  }

  const payload = await toSaveRequest('sales-order', record)
  return apiPost(
    ENDPOINTS.SALES_ORDER_DELIVERY_VERIFICATIONS(id),
    salesOrderDetailResponseSchema,
    payload,
    withIdempotencyKey(undefined, idempotencyKey),
  )
}
