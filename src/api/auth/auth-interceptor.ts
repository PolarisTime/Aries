import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosInstance } from 'axios'
import { message } from 'ant-design-vue'
import { getToken } from '@/utils/storage'
import { ENDPOINTS } from '@/constants/endpoints'
import { getRequestPath, isExactAuthEndpoint } from '@/utils/route-helpers'
import { normalizeErrorMessage } from './error-messages'
import { shouldTriggerRefresh, shouldClearAuthState } from './auth-guard'
import {
  getRefreshPromise,
  handleAuthFailure,
  refreshAccessToken,
  resetAuthFailureHandling,
  setRefreshPromise,
  retryWithToken,
} from './auth-state'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const HANDLED_REQUEST_ERROR_FLAG = '__leoRequestErrorHandled'
const PUBLIC_ENDPOINTS = [
  ENDPOINTS.SETUP_STATUS,
  ENDPOINTS.SETUP_INITIALIZE,
  ENDPOINTS.SETUP_ADMIN_2FA,
  ENDPOINTS.SETUP_ADMIN,
  ENDPOINTS.SETUP_COMPANY,
  ENDPOINTS.HEALTH,
]

function markHandledRequestError(error: unknown) {
  if (error && typeof error === 'object') {
    ;(error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] = true
  }
}

function isPublicEndpoint(url: string) {
  const path = getRequestPath(url)
  return PUBLIC_ENDPOINTS.some((endpoint) => path === endpoint || path === `/api${endpoint}`)
}

export function setupAuthInterceptors(http: AxiosInstance) {
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
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  http.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const status = error.response?.status
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const url = String(originalRequest?.url || '')
      const isAuthRequest =
        isExactAuthEndpoint(url, '/auth/login') ||
        isExactAuthEndpoint(url, '/auth/login-2fa') ||
        isExactAuthEndpoint(url, '/auth/logout') ||
        isExactAuthEndpoint(url, '/auth/refresh')
      const publicEndpoint = isPublicEndpoint(url)

      if (shouldTriggerRefresh(status, error, isAuthRequest || publicEndpoint, originalRequest)) {
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
          const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined
          const refreshMessage = normalizeErrorMessage(
            axios.isAxiosError(refreshError)
              ? refreshError.response?.data?.message || refreshError.message
              : error.message,
            refreshStatus,
          )

          markHandledRequestError(error)
          handleAuthFailure(refreshMessage)
          error.message = refreshMessage
          return Promise.reject(error)
        }
      }

      const description = normalizeErrorMessage(error.response?.data?.message || error.message, status)

      if (shouldClearAuthState(status, error, isAuthRequest || publicEndpoint, originalRequest)) {
        markHandledRequestError(error)
        handleAuthFailure(description)
      } else {
        message.error(description)
      }

      error.message = description

      return Promise.reject(error)
    },
  )
}
