import { ENDPOINTS } from '@/constants/endpoints'
import type {
  InitialSetupAdminSubmitPayload,
  InitialSetupStatus,
} from '@/shared/schemas'
import type { ApiResponse } from '@/types/api'
import { getApiMessage } from '@/utils/api-messages'
import { assertApiSuccess, http } from './client'

function setupTokenHeaders(setupToken: string) {
  return { headers: { 'X-Setup-Token': setupToken } }
}

export async function getInitialSetupStatus() {
  const response = await http.get<ApiResponse<InitialSetupStatus>>(
    ENDPOINTS.SETUP_STATUS,
  )
  return assertApiSuccess(response, getApiMessage('getInitStatusFailed'))
}

export async function submitInitialAdmin(
  payload: InitialSetupAdminSubmitPayload,
  setupToken: string,
) {
  const response = await http.post<ApiResponse<string>>(
    ENDPOINTS.SETUP_ADMIN,
    payload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('adminAccountInitFailed'))
}
