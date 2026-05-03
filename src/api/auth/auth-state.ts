import { AxiosHeaders } from 'axios'
import { message } from 'ant-design-vue'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import { ENDPOINTS } from '@/constants/endpoints'
import { ERROR_CODE } from '@/constants/error-codes'
import type { ApiResponse } from '@/types/api'
import type { LoginResponseData } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  getAuthPersistenceMode,
  getToken,
  setAuthSession,
} from '@/utils/storage'
import { authHttp } from '@/api/http'
import { getCurrentAppRoute } from '@/utils/route-helpers'
import { router } from '@/router'

let authFailureHandled = false

function notifyAuthStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT))
  }
}

export function clearAuthState() {
  clearToken()
  clearStoredUser()
  notifyAuthStateChanged()
}

export function applyTokenResponse(data: LoginResponseData) {
  authFailureHandled = false
  if (data.user) {
    setAuthSession(data.user, data.accessToken, getAuthPersistenceMode())
  }
  notifyAuthStateChanged()
}

export function handleAuthFailure(messageText: string) {
  if (authFailureHandled) {
    return
  }

  authFailureHandled = true
  clearAuthState()
  message.error(messageText)
  redirectToLogin()
}

export function resetAuthFailureHandling() {
  authFailureHandled = false
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return
  }

  const currentRoute = getCurrentAppRoute()
  if (currentRoute.startsWith('/login')) {
    return
  }

  router.push(`/login?redirect=${encodeURIComponent(currentRoute)}`)
}

let refreshPromise: Promise<void> | null = null

export async function refreshAccessToken() {
  const response = await authHttp.post<ApiResponse<LoginResponseData>>(ENDPOINTS.AUTH_REFRESH, {})
  const payload = response.data

  if (payload.code !== ERROR_CODE.SUCCESS) {
    throw new Error(payload.message || '刷新登录状态失败')
  }

  if (!payload.data?.accessToken || !payload.data?.user) {
    throw new Error(payload.message || '登录状态已失效，请重新登录')
  }

  applyTokenResponse(payload.data)
}

export function getRefreshPromise(): Promise<void> | null {
  return refreshPromise
}

export function setRefreshPromise(promise: Promise<void> | null) {
  refreshPromise = promise
}

type SetHeaderFn = (name: string, value: string) => void

export function retryWithToken(request: { headers?: Record<string, unknown> | { set?: SetHeaderFn } }) {
  const latestToken = getToken()
  if (!latestToken || !request.headers) {
    return
  }
  const h = request.headers
  // Prefer AxiosHeaders.set() when available; fall back to constructing new headers.
  if (typeof (h as { set?: SetHeaderFn }).set === 'function') {
    (h as { set: SetHeaderFn }).set('Authorization', `Bearer ${latestToken}`)
  } else {
    const merged = { ...(h as Record<string, string | undefined>), Authorization: `Bearer ${latestToken}` }
    request.headers = new AxiosHeaders(merged as Record<string, string>)
  }
}
