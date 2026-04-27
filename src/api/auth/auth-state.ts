import { AxiosHeaders } from 'axios'
import { message } from 'ant-design-vue'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import type { ApiResponse, LoginResponseData } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  getAuthPersistenceMode,
  getToken,
  setAuthSession,
} from '@/utils/storage'
import { authHttp } from '@/api/http'
import { getCurrentAppRoute } from '@/utils/route-helpers'

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

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return
  }

  const currentRoute = getCurrentAppRoute()
  if (currentRoute.startsWith('/login')) {
    return
  }

  window.location.replace(`/login?redirect=${encodeURIComponent(currentRoute)}`)
}

let refreshPromise: Promise<void> | null = null

export async function refreshAccessToken() {
  const response = await authHttp.post<ApiResponse<LoginResponseData>>('/auth/refresh', {})
  const payload = response.data

  if (payload.code !== 0 || !payload.data?.accessToken || !payload.data?.user) {
    throw new Error(payload.message || '刷新登录状态失败')
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
  if (latestToken && request.headers) {
    const h = request.headers
    const setFn = (h as { set?: SetHeaderFn }).set
    if (typeof setFn === 'function') {
      setFn('Authorization', `Bearer ${latestToken}`)
    } else {
      request.headers = AxiosHeaders.from({
        ...(h as Record<string, unknown>),
        Authorization: `Bearer ${latestToken}`,
      })
    }
  }
}
