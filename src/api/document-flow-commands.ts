import { normalizeRecord } from '@/api/business-normalizers'
import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import type { ApiResponse } from '@/types/api'
import type { RawApiRecord } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'

export async function completeSalesOrder(id: string) {
  return assertApiSuccess(
    await http.post<ApiResponse<ModuleRecord>>(
      `/sales-orders/${encodeURIComponent(id)}/complete`,
      null,
      withIdempotencyKey(),
    ),
    '完成销售失败',
  )
}

export async function saveAndCompleteSalesOrder(record: ModuleRecord) {
  const id = String(record.id || '').trim()
  if (!id) {
    throw new Error('销售订单 ID 不能为空')
  }

  const payload = await serializeBusinessRecordForSave('sales-order', record)
  const response = assertApiSuccess(
    await http.put<ApiResponse<RawApiRecord>>(
      `/sales-orders/${encodeURIComponent(id)}/save-and-complete`,
      payload,
      withIdempotencyKey(),
    ),
    '确认核定失败',
  )

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}
