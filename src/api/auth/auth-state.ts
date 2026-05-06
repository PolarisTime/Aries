import { AxiosHeaders } from 'axios'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import { ENDPOINTS } from '@/constants/endpoints'
import { ERROR_CODE } from '@/constants/error-codes'
import type { ApiResponse } from '@/types/api'
import type { LoginResponseData } from '@/types/auth'
import { message, notification } from '@/utils/antd-app'
import {
  clearStoredUser,
  clearToken,
  clearTokenExpiresAt,
  getAuthPersistenceMode,
  getToken,
  getTokenExpiresAt,
  setAuthSession,
} from '@/utils/storage'
import { authHttp } from '@/api/http'
import { getCurrentAppRoute } from '@/utils/route-helpers'
import { isApiKeyToken } from '@/utils/auth-token'

let authFailureHandled = false

const PRE_REFRESH_ADVANCE_MS = 5 * 60 * 1000
const REFRESH_EXPIRES_AT_KEY = 'aries-refresh-expires-at'
const REFRESH_WARNED_KEY = 'aries-refresh-warned'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

let preRefreshTimer: ReturnType<typeof setTimeout> | null = null

function notifyAuthStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT))
  }
}

export function clearAuthState() {
  clearToken()
  clearStoredUser()
  clearTokenExpiresAt()
  cancelPreRefresh()
  notifyAuthStateChanged()
}

export function applyTokenResponse(data: LoginResponseData) {
  authFailureHandled = false
  if (data.user) {
    setAuthSession(data.user, data.accessToken, data.expiresIn, getAuthPersistenceMode())
  }
  if (data.refreshExpiresIn) {
    const expiresAt = Date.now() + data.refreshExpiresIn * 1000
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(expiresAt))
      localStorage.removeItem(REFRESH_WARNED_KEY)
    }
  }
  cancelPreRefresh()
  schedulePreRefresh()
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

  window.location.href = `/login?redirect=${encodeURIComponent(currentRoute)}`
}

export function schedulePreRefresh(delayMs?: number) {
  cancelPreRefresh()
  if (typeof window === 'undefined') return

  const delay = delayMs ?? computePreRefreshDelay()
  if (delay <= 0) {
    executePreRefresh()
    return
  }
  preRefreshTimer = setTimeout(() => {
    preRefreshTimer = null
    executePreRefresh()
  }, Math.min(delay, 2_147_483_647))
}

export function cancelPreRefresh() {
  if (preRefreshTimer !== null) {
    clearTimeout(preRefreshTimer)
    preRefreshTimer = null
  }
}

function computePreRefreshDelay(): number {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return PRE_REFRESH_ADVANCE_MS
  const remaining = expiresAt - Date.now()
  const advance = Math.min(PRE_REFRESH_ADVANCE_MS, Math.max(60_000, remaining * 0.2))
  return remaining - advance
}

async function executePreRefresh() {
  const existing = getRefreshPromise()
  if (existing) {
    await existing
    return
  }

  let myPromise: Promise<void> | null = null
  try {
    myPromise = refreshAccessToken()
    setRefreshPromise(myPromise)
    await myPromise
  } catch {
    // silent fail: next real 401 will trigger passive refresh
  } finally {
    if (myPromise !== null && getRefreshPromise() === myPromise) {
      setRefreshPromise(null)
    }
  }
}

export function checkRefreshTokenExpiry() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(REFRESH_EXPIRES_AT_KEY)
  if (!raw) return
  if (localStorage.getItem(REFRESH_WARNED_KEY)) return

  const expiresAt = Number(raw)
  const remaining = expiresAt - Date.now()

  if (remaining > 0 && remaining <= ONE_DAY_MS) {
    notification.warning({
      message: '登录即将过期',
      description: '您的登录状态将在明天过期，请及时保存工作并重新登录',
      duration: 0,
    })
    localStorage.setItem(REFRESH_WARNED_KEY, '1')
  }
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
  if (typeof (h as { set?: SetHeaderFn }).set === 'function') {
    if (isApiKeyToken(latestToken)) {
      ;(h as AxiosHeaders).delete?.('Authorization')
      ;(h as { set: SetHeaderFn }).set('X-API-Key', latestToken)
    } else {
      ;(h as AxiosHeaders).delete?.('X-API-Key')
      ;(h as { set: SetHeaderFn }).set('Authorization', `Bearer ${latestToken}`)
    }
  } else {
    const merged = { ...(h as Record<string, string | undefined>) }
    if (isApiKeyToken(latestToken)) {
      delete merged.Authorization
      merged['X-API-Key'] = latestToken
    } else {
      delete merged['X-API-Key']
      merged.Authorization = `Bearer ${latestToken}`
    }
    request.headers = new AxiosHeaders(merged as Record<string, string>)
  }
}
