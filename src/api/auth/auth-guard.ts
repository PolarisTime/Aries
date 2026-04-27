import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { requestHadAuthorization } from './header-utils'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export function isAnonymousForbidden(error: unknown, originalRequest: RetryableRequestConfig | undefined) {
  if (!axios.isAxiosError(error)) {
    return false
  }
  const data = error.response?.data
  return (
    error.response?.status === 403
    && data?.error === 'Forbidden'
    && data?.code == null
    && !requestHadAuthorization(originalRequest)
  )
}

export function isUnauthorizedPayload(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false
  }

  const data = error.response?.data
  const code = Number(data?.code)
  const messageText = String(data?.message || '').trim()

  return code === 4010 || /未登录|登录已失效|登录状态已失效/i.test(messageText)
}

export function shouldTriggerRefresh(
  status: number | undefined,
  error: unknown,
  isAuthRequest: boolean,
  originalRequest: RetryableRequestConfig | undefined,
) {
  if (isAuthRequest || !originalRequest || originalRequest._retry) {
    return false
  }

  return status === 401 || isUnauthorizedPayload(error) || isAnonymousForbidden(error, originalRequest)
}

export function shouldClearAuthState(
  status: number | undefined,
  error: unknown,
  isAuthRequest: boolean,
  originalRequest: RetryableRequestConfig | undefined,
) {
  if (isAuthRequest) {
    return false
  }

  if (status === 401) {
    return true
  }

  return isUnauthorizedPayload(error) || isAnonymousForbidden(error, originalRequest)
}
