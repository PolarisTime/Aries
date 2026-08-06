import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { UserColumnSettingsPayload } from '@/types/module-page'

const columnSizesSchema = z.record(
  z.string(),
  z.number().int().min(1).max(800).catch(120),
)

const userColumnSettingsResponseSchema = z.object({
  pages: z.record(
    z.string(),
    z.object({
      orderedKeys: z.array(z.string()),
      hiddenKeys: z.array(z.string()),
      // 可选 + 值级兜底：兼容旧数据与单条坏值，避免 z.object strip 或整契约失败
      columnSizes: columnSizesSchema.optional(),
    }),
  ),
})

export async function getUserColumnSettings() {
  return apiGet(ENDPOINTS.ACCOUNT_PREFERENCES, userColumnSettingsResponseSchema)
}

export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  return apiPut(
    ENDPOINTS.ACCOUNT_PREFERENCES,
    userColumnSettingsResponseSchema,
    payload,
  )
}
