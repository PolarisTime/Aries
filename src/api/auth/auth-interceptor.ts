import type { AxiosInstance } from 'axios'
import axios from 'axios'
import {
  isCanceledRequestError,
  markHandledRequestError,
} from '@/api/request-errors'
import { ENDPOINTS } from '@/constants/endpoints'
import { message } from '@/utils/antd-app'
import { getRequestPath, isExactAuthEndpoint } from '@/utils/route-helpers'
import { navigateToServerErrorPage } from '@/utils/server-error-navigation'
import { getToken } from '@/utils/storage'
import { shouldClearAuthState, shouldTriggerRefresh } from './auth-guard'
import {
  handleAuthFailure,
  isAuthSessionSupersededError,
  refreshAccessToken,
  resetAuthFailureHandling,
  retryWithToken,
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

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function attachResponseMetadataToError(
  target: Error,
  source: {
    response?: {
      status?: unknown
      data?: { code?: unknown; traceId?: string }
      headers?: Record<string, unknown> & {
        get?: (name: string) => unknown
      }
    }
  },
): void {
  const status = toFiniteNumber(source.response?.status)
  const code = toFiniteNumber(source.response?.data?.code)
  if (status !== undefined) {
    ;(target as Error & { status: number }).status = status
  }
  if (code !== undefined) {
    ;(target as Error & { code: number }).code = code
  }
  attachTraceIdToError(target, extractBackendTraceId(source))
}

type GuardedAxiosInstance = AxiosInstance & {
  __leoAuthInterceptorsSetup?: boolean
  __leoBackendOfflineNavigationStarted?: boolean
}

function isBackendUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: unknown
    message?: unknown
    response?: unknown
  }
  if (candidate.response) return false
  const code = String(candidate.code || '')
  const messageText = String(candidate.message || '').toLowerCase()
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    messageText.includes('network error') ||
    messageText.includes('econnrefused') ||
    messageText.includes('timeout')
  )
}

const PUBLIC_ENDPOINTS = [
  ENDPOINTS.SETUP_STATUS,
  ENDPOINTS.SETUP_ADMIN,
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
      isExactAuthEndpoint(url, '/auth/refresh')

    if (token && !shouldSkipAuth) {
      resetAuthFailureHandling()
      config.headers.set?.('Authorization', `Bearer ${token}`)
      if (!config.headers.set) {
        ;(config.headers as Record<string, string | undefined>).Authorization =
          `Bearer ${token}`
      }
    }

    return config
  })

  http.interceptors.response.use(
    (response) => {
      guardedInstance.__leoBackendOfflineNavigationStarted = false
      return (response.config as { returnFullResponse?: boolean })
        .returnFullResponse
        ? response
        : response.data
    },
    async (error) => {
      if (isCanceledRequestError(error)) {
        const canceledErr = new Error(error?.message || '请求已取消')
        attachResponseMetadataToError(canceledErr, error)
        markHandledRequestError(canceledErr)
        return Promise.reject(canceledErr)
      }

      const status = error.response?.status
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const url = String(originalRequest?.url || '')
      const isAuthRequest =
        isExactAuthEndpoint(url, '/auth/login') ||
        isExactAuthEndpoint(url, '/auth/logout') ||
        isExactAuthEndpoint(url, '/auth/refresh')
      const publicEndpoint = isPublicEndpoint(url)

      if (isBackendUnavailableError(error)) {
        const description = normalizeErrorMessage(error.message, status)
        markHandledRequestError(error)
        if (!guardedInstance.__leoBackendOfflineNavigationStarted) {
          guardedInstance.__leoBackendOfflineNavigationStarted =
            navigateToServerErrorPage()
        }
        const networkErr = new Error(description)
        attachResponseMetadataToError(networkErr, error)
        markHandledRequestError(networkErr)
        return Promise.reject(networkErr)
      }

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
          await refreshAccessToken()

          retryWithToken(retryRequest)
          return http(retryRequest)
        } catch (refreshError) {
          if (isAuthSessionSupersededError(refreshError)) {
            markHandledRequestError(error)
            markHandledRequestError(refreshError)
            return Promise.reject(refreshError)
          }
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
          attachResponseMetadataToError(
            refreshErr,
            axios.isAxiosError(refreshError) ? refreshError : error,
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
      } else if (
        !originalRequest?.suppressGlobalErrorStatuses?.includes(Number(status))
      ) {
        markHandledRequestError(error)
        message.error(description)
      }

      const normalizedErr = new Error(description)
      attachResponseMetadataToError(normalizedErr, error)
      markHandledRequestError(normalizedErr)

      return Promise.reject(normalizedErr)
    },
  )
}
