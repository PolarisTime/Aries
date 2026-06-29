import axios, { AxiosHeaders, type AxiosResponse } from 'axios'
import { authHttp } from '@/api/http'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import { ENDPOINTS } from '@/constants/endpoints'
import { ERROR_CODE } from '@/constants/error-codes'
import { HTTP_STATUS } from '@/constants/http-status'
import type { LoginResponseData } from '@/shared/schemas'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'
import { getApiMessage } from '@/utils/api-messages'
import { isApiKeyToken } from '@/utils/auth-token'
import { getCurrentAppRoute } from '@/utils/route-helpers'
import {
  clearStoredUser,
  clearToken,
  clearTokenExpiresAt,
  getAuthPersistenceMode,
  getToken,
  getTokenExpiresAt,
  setAuthSession,
} from '@/utils/storage'

let authFailureHandled = false

const PRE_REFRESH_ADVANCE_MS = 5 * 60 * 1000
const REFRESH_EXPIRES_AT_KEY = 'aries-refresh-expires-at'
const REFRESH_WARNED_KEY = 'aries-refresh-warned'
const REFRESH_REUSE_RETRY_DELAY_MS = 250

let preRefreshTimer: ReturnType<typeof setTimeout> | null = null

export function isRefreshTokenReuseConflict(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false
  }
  return (
    error.response?.status === HTTP_STATUS.CONFLICT &&
    Number(error.response?.data?.code) ===
      ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT
  )
}

export function waitForRefreshTokenReuseRetry() {
  return new Promise((resolve) => {
    setTimeout(resolve, REFRESH_REUSE_RETRY_DELAY_MS)
  })
}

function notifyAuthStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT))
  }
}

function clearAuthState() {
  clearToken()
  clearStoredUser()
  clearTokenExpiresAt()
  cancelPreRefresh()
  notifyAuthStateChanged()
}

function applyTokenResponse(data: LoginResponseData) {
  authFailureHandled = false
  if (data.user) {
    setAuthSession(
      data.user,
      data.accessToken,
      data.expiresIn,
      getAuthPersistenceMode(),
    )
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

  const safe = currentRoute.startsWith('/') ? currentRoute : '/dashboard'
  window.location.href = `/login?redirect=${encodeURIComponent(safe)}`
}

function schedulePreRefresh(delayMs?: number) {
  cancelPreRefresh()
  if (typeof window === 'undefined') return

  const delay = delayMs ?? computePreRefreshDelay()
  if (delay <= 0) {
    void executePreRefresh()
    return
  }
  preRefreshTimer = setTimeout(
    () => {
      preRefreshTimer = null
      void executePreRefresh()
    },
    Math.min(delay, 2_147_483_647),
  )
}

function cancelPreRefresh() {
  if (preRefreshTimer !== null) {
    clearTimeout(preRefreshTimer)
    preRefreshTimer = null
  }
}

function computePreRefreshDelay(): number {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return PRE_REFRESH_ADVANCE_MS
  const remaining = expiresAt - Date.now()
  const advance = Math.min(
    PRE_REFRESH_ADVANCE_MS,
    Math.max(60_000, remaining * 0.2),
  )
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

let refreshPromise: Promise<void> | null = null

export async function refreshAccessToken() {
  let response: AxiosResponse<ApiResponse<LoginResponseData>>
  try {
    response = await authHttp.post<ApiResponse<LoginResponseData>>(
      ENDPOINTS.AUTH_REFRESH,
      {},
    )
  } catch (error) {
    if (!isRefreshTokenReuseConflict(error)) {
      throw error
    }
    await waitForRefreshTokenReuseRetry()
    response = await authHttp.post<ApiResponse<LoginResponseData>>(
      ENDPOINTS.AUTH_REFRESH,
      {},
    )
  }
  const payload = response.data

  if (payload.code !== ERROR_CODE.SUCCESS) {
    throw new Error(
      payload.message || getApiMessage('refreshLoginStatusFailed'),
    )
  }

  if (!payload.data?.accessToken || !payload.data?.user) {
    throw new Error(payload.message || getApiMessage('loginStatusExpired'))
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

export function retryWithToken(request: {
  headers?: Record<string, unknown> | { set?: SetHeaderFn }
}) {
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
