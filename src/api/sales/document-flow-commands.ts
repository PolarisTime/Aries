import { apiPost, apiPut, assertApiSuccess } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { toSaveRequest } from '@/module-system/record/module-save-payload'
import { mainFlowDetailResponseSchemas } from '@/shared/schemas/module-record'
import type { ApiResponse } from '@/types/api'
import type {
  MainFlowDetailRecord,
  MainFlowEditorDraft,
} from '@/types/module-record'

const salesOrderDetailResponseSchema =
  mainFlowDetailResponseSchemas['sales-order']

export async function completeSalesOrder(
  id: string,
): Promise<ApiResponse<MainFlowDetailRecord<'sales-order'>>> {
  return assertApiSuccess(
    await apiPost(
      `/sales-orders/${encodeURIComponent(id)}/complete`,
      salesOrderDetailResponseSchema,
      null,
      withIdempotencyKey(),
    ),
    '完成销售失败',
  )
}

export async function saveAndCompleteSalesOrder(
  record: MainFlowEditorDraft<'sales-order'>,
  idempotencyKey?: string,
): Promise<ApiResponse<MainFlowDetailRecord<'sales-order'>>> {
  const id = String(record.id || '').trim()
  if (!id) {
    throw new Error('销售订单 ID 不能为空')
  }

  const payload = await toSaveRequest('sales-order', record)
  const response = assertApiSuccess(
    await apiPut(
      `/sales-orders/${encodeURIComponent(id)}/save-and-complete`,
      salesOrderDetailResponseSchema,
      payload,
      withIdempotencyKey(undefined, idempotencyKey),
    ),
    '确认核定失败',
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data,
  }
}
