import { z } from 'zod'
import { apiGet, apiPut } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { UserColumnSettingsPayload } from '@/types/module-page'

const userColumnSettingsResponseSchema = z.object({
  pages: z.record(
    z.string(),
    z.object({
      orderedKeys: z.array(z.string()),
      hiddenKeys: z.array(z.string()),
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
