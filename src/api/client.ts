export { http, authHttp } from './http'
export { restoreRedirectedHistoryRoute } from '@/utils/route-helpers'

import { http } from './http'
import { setupAuthInterceptors } from './auth/auth-interceptor'

setupAuthInterceptors(http)

export function isSuccessCode(code: unknown) {
  return Number(code) === 0
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

const HANDLED_REQUEST_ERROR_FLAG = '__leoRequestErrorHandled'

export function isHandledRequestError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && (error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] === true
  )
}

export function restGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return http.get<T, T>(url, { params })
}

export function restPost<T>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return http.post<T, T>(url, data)
}

export function restPut<T>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return http.put<T, T>(url, data)
}

export function restDelete<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return http.delete<T, T>(url, { params })
}
