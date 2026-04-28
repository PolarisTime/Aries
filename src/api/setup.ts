import { http } from './client'
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

export function getInitialSetupStatus() {
  return http.get<ApiResponse<InitialSetupStatus>>(ENDPOINTS.SETUP_STATUS)
}

export function submitInitialSetup(payload: InitialSetupPayload) {
  return http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_INITIALIZE, payload)
}

export function setupInitialAdmin2fa(payload: InitialSetupTotpPayload) {
  return http.post<ApiResponse<InitialSetupTotpResult>>(ENDPOINTS.SETUP_ADMIN_2FA, payload)
}

export function submitInitialAdmin(payload: InitialSetupAdminSubmitPayload) {
  return http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_ADMIN, payload)
}

export function submitInitialCompany(payload: InitialSetupCompanyPayload) {
  return http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_COMPANY, payload)
}
