import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { InitialSetupPayload, InitialSetupResult, InitialSetupStatus } from '@/types/setup'

export function getInitialSetupStatus() {
  return http.get<ApiResponse<InitialSetupStatus>>(ENDPOINTS.SETUP_STATUS)
}

export function submitInitialSetup(payload: InitialSetupPayload) {
  return http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_INITIALIZE, payload)
}
