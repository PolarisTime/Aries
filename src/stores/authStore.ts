import i18next from 'i18next'
import { create } from 'zustand'
import { ERROR_CODE } from '@/constants/error-codes'
import {
  clearUserQueryCache,
  clearUserQueryCacheOnIdentityChange,
} from '@/lib/auth-query-cache'
import type {
  LoginPayload,
  LoginResponseData,
  LoginUser,
} from '@/shared/schemas'
import {
  type AuthPersistenceMode,
  clearStoredUser,
  clearToken,
  getAuthPersistenceMode,
  getStoredUser,
  getToken,
  getTokenExpiresAt,
  setAuthSession,
} from '@/utils/storage'

async function loadAuthApi() {
  return import('@/api/auth')
}

interface AuthState {
  token: string
  user: LoginUser | null
  isAuthenticated: boolean
  authReady: boolean
  hydrate: () => void
  signIn: (payload: LoginPayload) => Promise<LoginResponseData>
  signOut: () => Promise<void>
  restoreSession: () => Promise<boolean>
}

function persistSession(
  user: LoginUser,
  token: string,
  expiresIn: number,
  remember: boolean,
) {
  const mode: AuthPersistenceMode = remember ? 'local' : 'session'
  window.sessionStorage.removeItem('aries-logged-out')
  setAuthSession(user, token, expiresIn, mode)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken() || '',
  user: getStoredUser(),
  isAuthenticated: Boolean(getToken()),
  authReady: false,

  hydrate: () => {
    const nextToken = getToken() || ''
    const nextUser = getStoredUser()
    set({
      token: nextToken,
      user: nextUser,
      isAuthenticated: Boolean(nextToken || nextUser),
      authReady: false,
    })
  },

  signIn: async (payload: LoginPayload) => {
    const { login } = await loadAuthApi()
    const response = await login(payload)
    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || i18next.t('auth.error.loginFailed'))
    }
    const data = response.data
    if (!data.accessToken || !data.user) {
      throw new Error(i18next.t('auth.error.missingTokenOrUser'))
    }
    await clearUserQueryCacheOnIdentityChange(get().user, data.user)
    persistSession(
      data.user,
      data.accessToken,
      data.expiresIn,
      payload.remember !== false,
    )
    set({
      token: data.accessToken,
      user: data.user,
      isAuthenticated: true,
      authReady: true,
    })
    return data
  },

  signOut: async () => {
    await clearUserQueryCache()
    try {
      const { logout } = await loadAuthApi()
      await logout()
    } catch {
      /* non-critical */
    }
    clearToken()
    clearStoredUser()
    set({ token: '', user: null, isAuthenticated: false, authReady: true })
  },

  restoreSession: async () => {
    const { user } = get()
    // 无本地用户数据 → 未登录，静默跳过
    if (!user) {
      clearToken()
      clearStoredUser()
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
    try {
      const { refreshSession } = await loadAuthApi()
      const data = await refreshSession()
      if (!data.accessToken || !data.user)
        throw new Error(i18next.t('auth.error.sessionRestoreFailed'))
      await clearUserQueryCacheOnIdentityChange(user, data.user)
      persistSession(
        data.user,
        data.accessToken,
        data.expiresIn,
        getAuthPersistenceMode() === 'local',
      )
      set({
        token: data.accessToken,
        user: data.user,
        isAuthenticated: true,
        authReady: true,
      })
      return true
    } catch {
      const fallbackToken = getToken()
      const fallbackUser = getStoredUser()
      const tokenExpiresAt = getTokenExpiresAt()
      if (
        fallbackToken &&
        fallbackUser &&
        (!tokenExpiresAt || tokenExpiresAt > Date.now())
      ) {
        set({
          token: fallbackToken,
          user: fallbackUser,
          isAuthenticated: true,
          authReady: true,
        })
        return true
      }

      // refresh token 已过期且无可用 access token → 清除登录态
      clearToken()
      clearStoredUser()
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
  },
}))
