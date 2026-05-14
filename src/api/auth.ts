import { assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  CaptchaData,
  Login2faPayload,
  LoginPayload,
  LoginResponseData,
  LoginResult,
} from '@/types/auth'
import { getApiMessage } from '@/utils/api-messages'
import { authHttp, http } from './client'

export type HealthCheck = {
  status: string
  message?: string
}

export type HealthResponse = {
  status: string
  app: string
  traceId: string
  timestamp: string
  db?: HealthCheck
  redis?: HealthCheck
  disk?: HealthCheck
}

export function login(
  payload: LoginPayload,
): Promise<ApiResponse<LoginResult>> {
  return http.post<ApiResponse<LoginResult>>(ENDPOINTS.AUTH_LOGIN, {
    loginName: payload.loginName,
    password: payload.password,
    captchaId: payload.captchaId,
    captchaCode: payload.captchaCode,
  })
}

export function fetchCaptcha(): Promise<ApiResponse<CaptchaData>> {
  return http.get<ApiResponse<CaptchaData>>(ENDPOINTS.AUTH_CAPTCHA)
}

export function login2fa(
  payload: Login2faPayload,
): Promise<ApiResponse<LoginResponseData>> {
  return http.post<ApiResponse<LoginResponseData>>(
    ENDPOINTS.AUTH_LOGIN_2FA,
    payload,
  )
}

export function logout(): Promise<unknown> {
  return http.post(ENDPOINTS.AUTH_LOGOUT, {})
}

export async function refreshSession(): Promise<LoginResponseData> {
  const response = await authHttp.post<ApiResponse<LoginResponseData>>(
    ENDPOINTS.AUTH_REFRESH,
    {},
  )
  return response.data.data
}

export function pingAuth(): Promise<ApiResponse<string>> {
  return http.get<ApiResponse<string>>(ENDPOINTS.AUTH_PING)
}

export async function checkAuthPing(): Promise<boolean> {
  const response = await pingAuth()
  assertApiSuccess(response, getApiMessage('authServiceUnavailable'))
  return true
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  const response = await http.get<ApiResponse<HealthResponse>>(ENDPOINTS.HEALTH)
  return assertApiSuccess(response, getApiMessage('backendServiceUnavailable')).data
}
