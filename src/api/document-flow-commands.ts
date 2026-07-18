import { assertApiSuccess, http } from '@/api/client'
import { withIdempotencyKey } from '@/api/idempotency'
import type { ApiResponse } from '@/types/api'

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
