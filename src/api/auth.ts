import type { AxiosResponse } from 'axios'
import { assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { LoginPayload, LoginResponseData } from '@/shared/schemas'
import type { ApiResponse } from '@/types/api'
import { getApiMessage } from '@/utils/api-messages'
import {
  isRefreshTokenReuseConflict,
  waitForRefreshTokenReuseRetry,
} from './auth/auth-state'
import { authHttp, http } from './client'

export type HealthResponse = {
  status: string
}

export type BackendInfo = {
  app: string
  version: string
  gitCommit: string
  buildTime: string | null
}

export function login(
  payload: LoginPayload,
): Promise<ApiResponse<LoginResponseData>> {
  return http.post<ApiResponse<LoginResponseData>>(ENDPOINTS.AUTH_LOGIN, {
    loginName: payload.loginName,
    password: payload.password,
  })
}

export function logout(): Promise<unknown> {
  return http.post(ENDPOINTS.AUTH_LOGOUT, {})
}

export async function refreshSession(): Promise<LoginResponseData> {
  let response: AxiosResponse<ApiResponse<LoginResponseData>>
  try {
    response = await authHttp.post<ApiResponse<LoginResponseData>>(
      ENDPOINTS.AUTH_REFRESH,
      {},
    )
  } catch (error) {
    if (!isRefreshTokenReuseConflict(error)) {
      throw error
    }
    await waitForRefreshTokenReuseRetry()
    response = await authHttp.post<ApiResponse<LoginResponseData>>(
      ENDPOINTS.AUTH_REFRESH,
      {},
    )
  }
  return response.data.data
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  const response = await http.get<ApiResponse<HealthResponse>>(ENDPOINTS.HEALTH)
  return assertApiSuccess(response, getApiMessage('backendServiceUnavailable'))
    .data
}

export async function fetchBackendInfo(): Promise<BackendInfo> {
  const response = await http.get<ApiResponse<BackendInfo>>(ENDPOINTS.VERSION)
  return assertApiSuccess(response, getApiMessage('backendServiceUnavailable'))
    .data
}
