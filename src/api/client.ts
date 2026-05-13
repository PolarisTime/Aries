export { restoreRedirectedHistoryRoute } from '@/utils/route-helpers'
export { type ApiClient, authHttp, http } from './http'
export { isHandledRequestError } from './request-errors'

import { ERROR_CODE } from '@/constants/error-codes'
import { setupAuthInterceptors } from './auth/auth-interceptor'
import { http } from './http'

let authInterceptorsInitialized = false

export function ensureApiClientSetup() {
  if (authInterceptorsInitialized) {
    return
  }

  setupAuthInterceptors(http.instance)
  authInterceptorsInitialized = true
}

export function isSuccessCode(code: unknown) {
  return Number(code) === ERROR_CODE.SUCCESS
}

export function assertApiSuccess<T extends { code?: number; message?: string }>(
  response: T,
  fallbackMessage = '请求失败',
) {
  if (!isSuccessCode(response?.code)) {
    throw new Error(response?.message || fallbackMessage)
  }

  return response
}

export function restGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return http.get<T>(url, { params })
}

export function restPost<T>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return http.post<T>(url, data)
}

export function restPut<T>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return http.put<T>(url, data)
}

export function restDelete<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return http.delete<T>(url, { params })
}
