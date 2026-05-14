import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { UserColumnSettingsPayload } from '@/types/module-page'
import { getApiMessage } from '@/utils/api-messages'
import { assertApiSuccess, http } from './client'

export async function getUserColumnSettings() {
  const response = await http.get<ApiResponse<UserColumnSettingsPayload>>(
    ENDPOINTS.USER_ACCOUNT_PREFERENCES,
  )
  return assertApiSuccess(response, getApiMessage('loadAccountColumnSettingsFailed')).data
}

export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  const response = await http.put<ApiResponse<UserColumnSettingsPayload>>(
    ENDPOINTS.USER_ACCOUNT_PREFERENCES,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('saveAccountColumnSettingsFailed')).data
}
