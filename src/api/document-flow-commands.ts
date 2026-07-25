import { normalizeRecord } from '@/api/business-normalizers'
import { apiPost, apiPut, assertApiSuccess } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import { rawRecordResponseSchema } from '@/shared/schemas/api'
import type { ModuleRecord } from '@/types/module-page'

export async function completeSalesOrder(id: string) {
  return assertApiSuccess(
    await apiPost(
      `/sales-orders/${encodeURIComponent(id)}/complete`,
      rawRecordResponseSchema,
      null,
      withIdempotencyKey(),
    ),
    '完成销售失败',
  )
}

export async function saveAndCompleteSalesOrder(
  record: ModuleRecord,
  idempotencyKey?: string,
) {
  const id = String(record.id || '').trim()
  if (!id) {
    throw new Error('销售订单 ID 不能为空')
  }

  const payload = await serializeBusinessRecordForSave('sales-order', record)
  const response = assertApiSuccess(
    await apiPut(
      `/sales-orders/${encodeURIComponent(id)}/save-and-complete`,
      rawRecordResponseSchema,
      payload,
      withIdempotencyKey(undefined, idempotencyKey),
    ),
    '确认核定失败',
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}
