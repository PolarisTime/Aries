import { z } from 'zod'
import { apiGet, apiPut, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'
import type { UserColumnSettingsPayload } from '@/types/module-page'
import { getApiMessage } from '@/utils/api-messages'

const userColumnSettingsResponseSchema = apiResponseSchema(
  z.object({
    pages: z.record(
      z.string(),
      z.object({
        orderedKeys: z.array(z.string()),
        hiddenKeys: z.array(z.string()),
      }),
    ),
  }),
)

export async function getUserColumnSettings() {
  const response = await apiGet(
    ENDPOINTS.ACCOUNT_PREFERENCES,
    userColumnSettingsResponseSchema,
  )
  return assertApiSuccess(
    response,
    getApiMessage('loadAccountColumnSettingsFailed'),
  ).data
}

export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  const response = await apiPut(
    ENDPOINTS.ACCOUNT_PREFERENCES,
    userColumnSettingsResponseSchema,
    payload,
  )
  return assertApiSuccess(
    response,
    getApiMessage('saveAccountColumnSettingsFailed'),
  ).data
}
