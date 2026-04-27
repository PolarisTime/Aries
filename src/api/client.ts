export { http, authHttp, type ApiClient } from './http'
export { restoreRedirectedHistoryRoute } from '@/utils/route-helpers'

import { http } from './http'
import { ERROR_CODE } from '@/constants/error-codes'
import { setupAuthInterceptors } from './auth/auth-interceptor'

setupAuthInterceptors(http.instance)

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

const HANDLED_REQUEST_ERROR_FLAG = '__leoRequestErrorHandled'

export function isHandledRequestError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && (error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] === true
  )
}

export function restGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return http.get<T>(url, { params })
}

export function restPost<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return http.post<T>(url, data)
}

export function restPut<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return http.put<T>(url, data)
}

export function restDelete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return http.delete<T>(url, { params })
}
