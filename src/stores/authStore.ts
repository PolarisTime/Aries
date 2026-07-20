import i18next from 'i18next'
import { create } from 'zustand'
import {
  applyAuthSession,
  clearAuthSession,
  scheduleAuthRefresh,
} from '@/api/auth/auth-state'
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
  getStoredUser,
  getToken,
  getTokenExpiresAt,
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
  syncFromStorage: () => void
  signIn: (payload: LoginPayload) => Promise<LoginResponseData>
  signOut: () => Promise<void>
  restoreSession: () => Promise<boolean>
}

function readStoredAuthState(authReady: boolean) {
  const token = getToken() || ''
  const user = getStoredUser()
  return {
    token,
    user,
    isAuthenticated: Boolean(token || user),
    authReady,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken() || '',
  user: getStoredUser(),
  isAuthenticated: Boolean(getToken()),
  authReady: false,

  hydrate: () => {
    set(readStoredAuthState(false))
  },

  syncFromStorage: () => {
    set(readStoredAuthState(true))
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
    const mode: AuthPersistenceMode =
      payload.remember === false ? 'session' : 'local'
    window.sessionStorage.removeItem('aries-logged-out')
    applyAuthSession(data, mode)
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
    clearAuthSession()
    set({ token: '', user: null, isAuthenticated: false, authReady: true })
  },

  restoreSession: async () => {
    const { user } = get()
    // 无本地用户数据 → 未登录，静默跳过
    if (!user) {
      clearAuthSession()
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
    try {
      const { refreshSession } = await loadAuthApi()
      const data = await refreshSession()
      if (!data.accessToken || !data.user)
        throw new Error(i18next.t('auth.error.sessionRestoreFailed'))
      await clearUserQueryCacheOnIdentityChange(user, data.user)
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
        scheduleAuthRefresh()
        set({
          token: fallbackToken,
          user: fallbackUser,
          isAuthenticated: true,
          authReady: true,
        })
        return true
      }

      // refresh token 已过期且无可用 access token → 清除登录态
      clearAuthSession()
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
  },
}))
