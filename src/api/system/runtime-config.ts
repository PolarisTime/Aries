import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/core/client'
import { apiResponseSchema } from '@/shared/schemas/api'
import type { RuntimeConfigResponse } from '@/types/runtime-config'

const RUNTIME_CONFIG_ENDPOINT = '/runtime-config'

const runtimeConfigResponseSchema = apiResponseSchema(
  z.object({
    ui: z.object({
      defaultPageSize: z.number().int().positive(),
      showSnowflakeId: z.boolean(),
    }),
    business: z.object({
      statement: z.object({
        customerReceiptAmountZero: z.boolean(),
      }),
    }),
    features: z.object({
      weightOnlyPurchaseInbound: z.boolean(),
      weightOnlySalesOutbound: z.boolean(),
    }),
  }),
)

export async function getRuntimeConfig(): Promise<RuntimeConfigResponse> {
  const response = assertApiSuccess(
    await apiGet(RUNTIME_CONFIG_ENDPOINT, runtimeConfigResponseSchema),
    '加载运行时配置失败',
  )
  return response.data
}
