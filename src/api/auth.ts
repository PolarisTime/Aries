import { http, authHttp } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  CaptchaData,
  Login2faPayload,
  LoginPayload,
  LoginResult,
  LoginResponseData,
} from '@/types/auth'

export function login(payload: LoginPayload) {
  return http.post<ApiResponse<LoginResult>>(ENDPOINTS.AUTH_LOGIN, {
    loginName: payload.loginName,
    password: payload.password,
    captchaId: payload.captchaId,
    captchaCode: payload.captchaCode,
  })
}

export function fetchCaptcha() {
  return http.get<ApiResponse<CaptchaData>>('/auth/captcha')
}

export function login2fa(payload: Login2faPayload) {
  return http.post<ApiResponse<LoginResponseData>>(ENDPOINTS.AUTH_LOGIN_2FA, payload)
}

export function logout() {
  return http.post(ENDPOINTS.AUTH_LOGOUT, {})
}

export async function refreshSession(): Promise<LoginResponseData> {
  const response = await authHttp.post<ApiResponse<LoginResponseData>>(ENDPOINTS.AUTH_REFRESH, {})
  return (response.data as ApiResponse<LoginResponseData>).data
}

export function pingAuth() {
  return http.get<ApiResponse<string>>(ENDPOINTS.AUTH_PING)
}
