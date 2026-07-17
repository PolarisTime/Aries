import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { getApiMessage } from '@/utils/api-messages'

export interface ChangeOwnPasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function changeOwnPassword(
  payload: ChangeOwnPasswordPayload,
): Promise<ApiResponse<null>> {
  const response = await http.post<ApiResponse<null>>(
    ENDPOINTS.ACCOUNT_PASSWORD,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('changePasswordFailed'))
}
