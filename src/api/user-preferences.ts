import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { UserColumnSettingsPayload } from '@/types/module-page'
import { assertApiSuccess, http } from './client'

export async function getUserColumnSettings() {
  const response = await http.get<ApiResponse<UserColumnSettingsPayload>>(
    ENDPOINTS.USER_ACCOUNT_PREFERENCES,
  )
  return assertApiSuccess(response, '加载账号列设置失败').data
}

export async function saveUserColumnSettings(
  payload: UserColumnSettingsPayload,
) {
  const response = await http.put<ApiResponse<UserColumnSettingsPayload>>(
    ENDPOINTS.USER_ACCOUNT_PREFERENCES,
    payload,
  )
  return assertApiSuccess(response, '保存账号列设置失败').data
}
