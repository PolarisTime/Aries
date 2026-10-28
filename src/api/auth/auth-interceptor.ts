import type { AxiosInstance } from 'axios'
import axios from 'axios'
import {
  shouldClearAuthState,
  shouldTriggerRefresh,
} from '@/api/auth/auth-guard'
import {
  handleAuthFailure,
  isAuthSessionSupersededError,
  refreshAccessToken,
  retryWithToken,
} from '@/api/auth/auth-state'
import { normalizeErrorMessage } from '@/api/auth/error-messages'
import type { RetryableRequestConfig } from '@/api/auth/types'
import {
  isCanceledRequestError,
  markHandledRequestError,
} from '@/api/core/request-errors'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiProblemSchema } from '@/shared/schemas/api'
import { message } from '@/utils/antd-app'
import { apiBaseUrl } from '@/utils/env'
import { getRequestPath, isExactAuthEndpoint } from '@/utils/route-helpers'
import { getToken } from '@/utils/storage'

type BackendErrorResponse = {
  data?: unknown
  headers?: Record<string, unknown> & {
    get?: (name: string) => unknown
  }
}

function readContentType(response: BackendErrorResponse): string {
  const value =
    response.headers?.get?.('content-type') ??
    response.headers?.['content-type'] ??
    response.headers?.['Content-Type']
  return typeof value === 'string' ? value.toLowerCase() : ''
}

async function normalizeBackendErrorPayload(error: unknown): Promise<void> {
  if (!error || typeof error !== 'object') return
  const response = (error as { response?: BackendErrorResponse }).response
  if (!response) return

  if (
    typeof Blob !== 'undefined' &&
    response.data instanceof Blob &&
    (readContentType(response).includes('json') ||
      response.data.type.toLowerCase().includes('json'))
  ) {
    try {
      const text = await response.data.text()
      response.data = text ? JSON.parse(text) : undefined
    } catch {
      return
    }
  }

  const parsed = apiProblemSchema.safeParse(response.data)
  if (parsed.success) {
    response.data = parsed.data
  }
}

function extractBackendMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const data = (error as { response?: BackendErrorResponse }).response?.data
  if (!data || typeof data !== 'object') return undefined
  const payload = data as Record<string, unknown>
  const value = payload.detail ?? payload.message ?? payload.title
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

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
  ENDPOINTS.RUNTIME_CONFIG,
  ENDPOINTS.SETUP_ACCOUNT,
  ENDPOINTS.HEALTH,
  // /version 已改为登录可见（返回体含提交哈希）：必须带 token，否则 401
]
const API_BASE_PATH = getRequestPath(apiBaseUrl).replace(/\/$/, '')

function isPublicEndpoint(url: string) {
  const path = getRequestPath(url)
  return PUBLIC_ENDPOINTS.some(
    (endpoint) => path === endpoint || path === `${API_BASE_PATH}${endpoint}`,
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
      isExactAuthEndpoint(url, ENDPOINTS.AUTH_LOGIN) ||
      isExactAuthEndpoint(url, ENDPOINTS.AUTH_REFRESH)

    if (token && !shouldSkipAuth) {
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

      await normalizeBackendErrorPayload(error)

      const status = error.response?.status
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const url = String(originalRequest?.url || '')
      const isAuthRequest =
        isExactAuthEndpoint(url, ENDPOINTS.AUTH_LOGIN) ||
        isExactAuthEndpoint(url, ENDPOINTS.AUTH_LOGOUT) ||
        isExactAuthEndpoint(url, ENDPOINTS.AUTH_REFRESH)
      const publicEndpoint = isPublicEndpoint(url)

      if (isBackendUnavailableError(error)) {
        const description = normalizeErrorMessage(error.message, status)
        markHandledRequestError(error)
        const networkErr = new Error(description)
        attachResponseMetadataToError(networkErr, error)
        markHandledRequestError(networkErr)
        /*
         * 后端不可达**不再整页跳 /server-error**。
         *
         * <p>原来的 `navigateToServerErrorPage()` 会 `location.assign` 整页导航：
         * 所有页签、筛选条件、已填未保存的表单全部丢失，用户点一次浏览器返回也回不到
         * 原上下文（多标签页 store 已随页面销毁）。而 5xx 的错误响应走的是"页面内
         * Alert + 重试"（见 BusinessGridContent 的 hasLoadError 分支），
         * 同一类故障出现两套完全不同的表现。</p>
         *
         * <p>现在两条路径统一为就地提示：错误对象照常向上抛，由页面渲染可重试的错误态；
         * 页签、URL 与筛选条件都保留。只有登录态失效（401）才需要离开当前页。</p>
         */
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
              ? extractBackendMessage(refreshError) || refreshError.message
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
        extractBackendMessage(error) || error.message,
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
        // 查询类请求（GET）的错误由页面内呈现，避免与页内错误重复提示；
        // 写操作（POST/PUT/PATCH/DELETE）错误仍走全局提示。
        String(originalRequest?.method ?? '').toLowerCase() !== 'get' &&
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
