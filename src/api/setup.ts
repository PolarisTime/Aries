import { http } from './client'
import type { ApiResponse } from '@/types/auth'
import type { InitialSetupPayload, InitialSetupResult, InitialSetupStatus } from '@/types/setup'

export function getInitialSetupStatus() {
  return http.get<ApiResponse<InitialSetupStatus>, ApiResponse<InitialSetupStatus>>('/setup/status')
}

export function submitInitialSetup(payload: InitialSetupPayload) {
  return http.post<ApiResponse<InitialSetupResult>, ApiResponse<InitialSetupResult>>(
    '/setup/initialize',
    payload,
  )
}
