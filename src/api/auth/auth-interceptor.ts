import type { AxiosInstance } from 'axios'
import axios from 'axios'
import {
  isCanceledRequestError,
  markHandledRequestError,
} from '@/api/request-errors'
import { ENDPOINTS } from '@/constants/endpoints'
import { message } from '@/utils/antd-app'
import { isApiKeyToken } from '@/utils/auth-token'
import { getRequestPath, isExactAuthEndpoint } from '@/utils/route-helpers'
import { getToken } from '@/utils/storage'
import { shouldClearAuthState, shouldTriggerRefresh } from './auth-guard'
import {
  getRefreshPromise,
  handleAuthFailure,
  refreshAccessToken,
  resetAuthFailureHandling,
  retryWithToken,
  setRefreshPromise,
} from './auth-state'
import { normalizeErrorMessage } from './error-messages'
import type { RetryableRequestConfig } from './types'

function extractBackendTraceId(error: {
  response?: {
    data?: { traceId?: string }
    headers?: Record<string, unknown> & {
      get?: (name: string) => unknown
    }
  }
}): string | undefined {
  const bodyTraceId = error.response?.data?.traceId
  if (bodyTraceId) {
    return bodyTraceId
  }

  const headers = error.response?.headers
  const headerTraceId =
    headers?.get?.('x-trace-id') ??
    headers?.get?.('X-Trace-Id') ??
    headers?.get?.('traceId') ??
    headers?.get?.('traceid') ??
    headers?.['x-trace-id'] ??
    headers?.['X-Trace-Id'] ??
    headers?.traceId ??
    headers?.traceid
  return typeof headerTraceId === 'string' && headerTraceId.length > 0
    ? headerTraceId
    : undefined
}

function attachTraceIdToError(err: Error, traceId: string | undefined) {
  if (traceId) {
    ;(err as Error & { traceId: string }).traceId = traceId
  }
}

type GuardedAxiosInstance = AxiosInstance & {
  __leoAuthInterceptorsSetup?: boolean
}

const PUBLIC_ENDPOINTS = [
  ENDPOINTS.SETUP_STATUS,
  ENDPOINTS.SETUP_INITIALIZE,
  ENDPOINTS.SETUP_ADMIN_2FA,
  ENDPOINTS.SETUP_ADMIN,
  ENDPOINTS.SETUP_COMPANY,
  ENDPOINTS.HEALTH,
  ENDPOINTS.VERSION,
]

function isPublicEndpoint(url: string) {
  const path = getRequestPath(url)
  return PUBLIC_ENDPOINTS.some(
    (endpoint) => path === endpoint || path === `/api${endpoint}`,
  )
}

export function setupAuthInterceptors(http: AxiosInstance) {
  const guardedInstance = http as GuardedAxiosInstance
  if (guardedInstance.__leoAuthInterceptorsSetup) {
    return
  }
  guardedInstance.__leoAuthInterceptorsSetup = true

  http.interceptors.request.use((config) => {
    const token = getToken()
    const url = String(config.url || '')
    const publicEndpoint = isPublicEndpoint(url)
    const shouldSkipAuth =
      publicEndpoint ||
      isExactAuthEndpoint(url, '/auth/login') ||
      isExactAuthEndpoint(url, '/auth/login-2fa') ||
      isExactAuthEndpoint(url, '/auth/refresh')

    if (token && !shouldSkipAuth) {
      resetAuthFailureHandling()
      if (isApiKeyToken(token)) {
        config.headers.delete?.('Authorization')
        config.headers.set?.('X-API-Key', token)
        if (!config.headers.set) {
          ;(
            config.headers as Record<string, string | undefined>
          ).Authorization = undefined
          ;(config.headers as Record<string, string | undefined>)['X-API-Key'] =
            token
        }
      } else {
        config.headers.delete?.('X-API-Key')
        config.headers.set?.('Authorization', `Bearer ${token}`)
        if (!config.headers.set) {
          ;(config.headers as Record<string, string | undefined>)['X-API-Key'] =
            undefined
          ;(
            config.headers as Record<string, string | undefined>
          ).Authorization = `Bearer ${token}`
        }
      }
    }

    return config
  })

  http.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      if (isCanceledRequestError(error)) {
        const canceledErr = new Error(error?.message || '请求已取消')
        attachTraceIdToError(canceledErr, extractBackendTraceId(error))
        markHandledRequestError(canceledErr)
        return Promise.reject(canceledErr)
      }

      const status = error.response?.status
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const url = String(originalRequest?.url || '')
      const isAuthRequest =
        isExactAuthEndpoint(url, '/auth/login') ||
        isExactAuthEndpoint(url, '/auth/login-2fa') ||
        isExactAuthEndpoint(url, '/auth/logout') ||
        isExactAuthEndpoint(url, '/auth/refresh')
      const publicEndpoint = isPublicEndpoint(url)

      if (
        shouldTriggerRefresh(
          status,
          error,
          isAuthRequest || publicEndpoint,
          originalRequest,
        )
      ) {
        try {
          const retryRequest = originalRequest as RetryableRequestConfig
          retryRequest._retry = true
          let current = getRefreshPromise()
          if (!current) {
            current = refreshAccessToken()
            setRefreshPromise(current)
          }
          try {
            await current
          } finally {
            if (getRefreshPromise() === current) {
              setRefreshPromise(null)
            }
          }

          retryWithToken(retryRequest)
          return http(retryRequest)
        } catch (refreshError) {
          const refreshStatus = axios.isAxiosError(refreshError)
            ? refreshError.response?.status
            : undefined
          const refreshMessage = normalizeErrorMessage(
            axios.isAxiosError(refreshError)
              ? refreshError.response?.data?.message || refreshError.message
              : refreshError instanceof Error
                ? refreshError.message
                : error.message,
            refreshStatus,
          )

          markHandledRequestError(error)
          handleAuthFailure(refreshMessage)
          const refreshErr = new Error(refreshMessage)
          attachTraceIdToError(
            refreshErr,
            extractBackendTraceId(
              axios.isAxiosError(refreshError) ? refreshError : error,
            ),
          )
          markHandledRequestError(refreshErr)
          return Promise.reject(refreshErr)
        }
      }

      const description = normalizeErrorMessage(
        error.response?.data?.message || error.message,
        status,
      )

      if (
        shouldClearAuthState(
          status,
          error,
          isAuthRequest || publicEndpoint,
          originalRequest,
        )
      ) {
        markHandledRequestError(error)
        handleAuthFailure(description)
      } else {
        markHandledRequestError(error)
        message.error(description)
      }

      const normalizedErr = new Error(description)
      attachTraceIdToError(normalizedErr, extractBackendTraceId(error))
      markHandledRequestError(normalizedErr)

      return Promise.reject(normalizedErr)
    },
  )
}
