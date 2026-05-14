import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  InitialSetupAdminSubmitPayload,
  InitialSetupCompanyPayload,
  InitialSetupPayload,
  InitialSetupResult,
  InitialSetupStatus,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
} from '@/types/setup'
import { getApiMessage } from '@/utils/api-messages'
import { assertApiSuccess, http } from './client'

export async function getInitialSetupStatus() {
  const response = await http.get<ApiResponse<InitialSetupStatus>>(
    ENDPOINTS.SETUP_STATUS,
  )
  return assertApiSuccess(response, getApiMessage('getInitStatusFailed'))
}

export async function submitInitialSetup(payload: InitialSetupPayload) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(
    ENDPOINTS.SETUP_INITIALIZE,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('firstInitFailed'))
}

export async function setupInitialAdmin2fa(payload: InitialSetupTotpPayload) {
  const response = await http.post<ApiResponse<InitialSetupTotpResult>>(
    ENDPOINTS.SETUP_ADMIN_2FA,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('generateAdmin2faFailed'))
}

export async function submitInitialAdmin(
  payload: InitialSetupAdminSubmitPayload,
) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(
    ENDPOINTS.SETUP_ADMIN,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('adminAccountInitFailed'))
}

export async function submitInitialCompany(
  payload: InitialSetupCompanyPayload,
) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(
    ENDPOINTS.SETUP_COMPANY,
    payload,
  )
  return assertApiSuccess(response, getApiMessage('companyInitFailed'))
}
