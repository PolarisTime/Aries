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
import { getCurrentAppRoute } from '@/utils/route-helpers'
import {
  type AuthPersistenceMode,
  clearStoredUser,
  clearToken,
  clearTokenExpiresAt,
  getAuthPersistenceMode,
  getToken,
  getTokenExpiresAt,
  setAuthSession,
} from '@/utils/storage'

let authFailureHandled = false
let authSessionEpoch = 0

const PRE_REFRESH_ADVANCE_MS = 5 * 60 * 1000
const REFRESH_EXPIRES_AT_KEY = 'aries-refresh-expires-at'
const REFRESH_WARNED_KEY = 'aries-refresh-warned'
const REFRESH_REUSE_RETRY_DELAY_MS = 250

let preRefreshTimer: ReturnType<typeof setTimeout> | null = null

export class AuthSessionSupersededError extends Error {
  constructor() {
    super('登录状态已变更，已忽略过期刷新结果')
    this.name = 'AuthSessionSupersededError'
  }
}

export function isAuthSessionSupersededError(
  error: unknown,
): error is AuthSessionSupersededError {
  return error instanceof AuthSessionSupersededError
}

function assertAuthSessionCurrent(epoch: number) {
  if (epoch !== authSessionEpoch) {
    throw new AuthSessionSupersededError()
  }
}

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

export function clearAuthSession() {
  authSessionEpoch += 1
  clearToken()
  clearStoredUser()
  clearTokenExpiresAt()
  cancelPreRefresh()
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_EXPIRES_AT_KEY)
    localStorage.removeItem(REFRESH_WARNED_KEY)
  }
  notifyAuthStateChanged()
}

export function applyAuthSession(
  data: LoginResponseData,
  mode: AuthPersistenceMode = getAuthPersistenceMode(),
) {
  authSessionEpoch += 1
  authFailureHandled = false
  setAuthSession(data.user, data.accessToken, data.expiresIn, mode)
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
  clearAuthSession()
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

export function scheduleAuthRefresh() {
  schedulePreRefresh()
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
  try {
    await refreshAccessToken()
  } catch {
    // silent fail: next real 401 will trigger passive refresh
  }
}

let refreshPromise: Promise<LoginResponseData> | null = null

async function requestTokenRefresh(): Promise<LoginResponseData> {
  const requestEpoch = authSessionEpoch
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
    assertAuthSessionCurrent(requestEpoch)
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

  assertAuthSessionCurrent(requestEpoch)
  applyAuthSession(payload.data)
  return payload.data
}

export function refreshAccessToken(): Promise<LoginResponseData> {
  if (refreshPromise) {
    return refreshPromise
  }

  const pending = requestTokenRefresh()
  const tracked = pending.finally(() => {
    if (refreshPromise === tracked) {
      refreshPromise = null
    }
  })
  refreshPromise = tracked
  return tracked
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
    ;(h as { set: SetHeaderFn }).set('Authorization', `Bearer ${latestToken}`)
  } else {
    const merged = { ...(h as Record<string, string | undefined>) }
    merged.Authorization = `Bearer ${latestToken}`
    request.headers = new AxiosHeaders(merged as Record<string, string>)
  }
}
