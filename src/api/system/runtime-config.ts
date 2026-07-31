import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { initialSetupStatusSchema } from '@/shared/schemas/setup'
import type { RuntimeConfigResponse } from '@/types/runtime-config'

const runtimeConfigResponseSchema = z.object({
  setup: initialSetupStatusSchema,
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
})

export async function getRuntimeConfig(): Promise<RuntimeConfigResponse> {
  return apiGet(ENDPOINTS.RUNTIME_CONFIG, runtimeConfigResponseSchema)
}
