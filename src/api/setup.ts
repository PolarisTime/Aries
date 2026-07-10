import { ENDPOINTS } from '@/constants/endpoints'
import type {
  InitialSetupAdminSubmitPayload,
  InitialSetupCompanyPayload,
  InitialSetupStatus,
  InitialSetupSubmitResponse,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
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

export async function setupInitialAdmin2fa(
  payload: InitialSetupTotpPayload,
  setupToken: string,
) {
  const response = await http.post<ApiResponse<InitialSetupTotpResult>>(
    ENDPOINTS.SETUP_ADMIN_2FA,
    payload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('generateAdmin2faFailed'))
}

export async function submitInitialAdmin(
  payload: InitialSetupAdminSubmitPayload,
  setupToken: string,
) {
  const response = await http.post<ApiResponse<InitialSetupSubmitResponse>>(
    ENDPOINTS.SETUP_ADMIN,
    payload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('adminAccountInitFailed'))
}

export async function submitInitialCompany(
  payload: InitialSetupCompanyPayload,
  setupToken: string,
) {
  const response = await http.post<ApiResponse<InitialSetupSubmitResponse>>(
    ENDPOINTS.SETUP_COMPANY,
    payload,
    setupTokenHeaders(setupToken),
  )
  return assertApiSuccess(response, getApiMessage('companyInitFailed'))
}
