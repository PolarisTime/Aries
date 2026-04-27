import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosInstance } from 'axios'
import { message } from 'ant-design-vue'
import type { ApiResponse, LoginResponseData } from '@/types/auth'
import { getToken } from '@/utils/storage'
import { isExactAuthEndpoint } from '@/utils/route-helpers'
import { normalizeErrorMessage } from './error-messages'
import { shouldTriggerRefresh, shouldClearAuthState } from './auth-guard'
import { applyTokenResponse, handleAuthFailure, setRefreshPromise, retryWithToken } from './auth-state'
import { authHttp } from '@/api/http'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const HANDLED_REQUEST_ERROR_FLAG = '__leoRequestErrorHandled'

function markHandledRequestError(error: unknown) {
  if (error && typeof error === 'object') {
    ;(error as Record<string, unknown>)[HANDLED_REQUEST_ERROR_FLAG] = true
  }
}

async function refreshAccessToken() {
  const response = await authHttp.post<ApiResponse<LoginResponseData>>('/auth/refresh', {})
  const payload = response.data

  if (Number(payload.code) !== 0 || !payload.data?.accessToken || !payload.data?.user) {
    throw new Error(payload.message || '刷新登录状态失败')
  }

  applyTokenResponse(payload.data)
}

export function setupAuthInterceptors(http: AxiosInstance) {
  http.interceptors.request.use((config) => {
    const token = getToken()
    const url = String(config.url || '')
    const shouldSkipAuth =
      isExactAuthEndpoint(url, '/auth/login') ||
      isExactAuthEndpoint(url, '/auth/login-2fa') ||
      isExactAuthEndpoint(url, '/auth/refresh')

    if (token && !shouldSkipAuth) {
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

      if (shouldTriggerRefresh(status, error, isAuthRequest, originalRequest)) {
        try {
          const retryRequest = originalRequest as RetryableRequestConfig
          retryRequest._retry = true
          const current = (async () => {
            await refreshAccessToken()
          })()
          setRefreshPromise(current)
          try {
            await current
          } finally {
            setRefreshPromise(null)
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

      if (shouldClearAuthState(status, error, isAuthRequest, originalRequest)) {
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
