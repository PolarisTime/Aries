import { http } from './client'
import type {
  ApiResponse,
  Login2faPayload,
  LoginPayload,
  LoginResult,
  LoginResponseData,
} from '@/types/auth'
import { authHttp } from './client'

export function login(payload: LoginPayload) {
  return http.post<ApiResponse<LoginResult>, ApiResponse<LoginResult>>(
    '/auth/login',
    {
      loginName: payload.loginName,
      password: payload.password,
    },
  )
}

export function login2fa(payload: Login2faPayload) {
  return http.post<ApiResponse<LoginResponseData>, ApiResponse<LoginResponseData>>(
    '/auth/login-2fa',
    payload,
  )
}

export function logout() {
  return http.post('/auth/logout', {})
}

export function refreshSession() {
  return authHttp.post<ApiResponse<LoginResponseData>>('/auth/refresh', {})
    .then((response) => response.data)
}

export function pingAuth() {
  return http.get<ApiResponse<string>, ApiResponse<string>>('/auth/ping')
}
