import { create } from 'zustand'
import { login, login2fa, logout, refreshSession } from '@/api/auth'
import { ERROR_CODE } from '@/constants/error-codes'
import type { LoginPayload, Login2faPayload, LoginUser } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  getAuthPersistenceMode,
  getStoredUser,
  getToken,
  setAuthSession,
  type AuthPersistenceMode,
} from '@/utils/storage'

interface LoginStep2 {
  requires2fa: true
  tempToken: string
}

interface LoginStep1Result {
  requires2fa: false
  accessToken: string
  user: LoginUser
  expiresIn: number
}

type LoginResult = LoginStep1Result | LoginStep2

interface AuthState {
  token: string
  user: LoginUser | null
  isAuthenticated: boolean
  hydrate: () => void
  signIn: (payload: LoginPayload) => Promise<LoginResult>
  verify2fa: (payload: Login2faPayload) => Promise<void>
  signOut: () => Promise<void>
  restoreSession: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken() || '',
  user: getStoredUser(),
  isAuthenticated: Boolean(getToken()),

  hydrate: () => {
    set({
      token: getToken() || '',
      user: getStoredUser(),
      isAuthenticated: Boolean(getToken()),
    })
  },

  signIn: async (payload: LoginPayload) => {
    const response = await login(payload)

    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || '登录失败')
    }

    const data = response.data

    if ('requires2fa' in data && data.requires2fa) {
      if (!data.tempToken) {
        throw new Error('登录响应缺少二次验证令牌')
      }
      return { requires2fa: true as const, tempToken: data.tempToken }
    }

    if (!('accessToken' in data) || !data.accessToken || !data.user) {
      throw new Error('登录响应缺少 token 或用户信息')
    }

    const mode: AuthPersistenceMode = payload.remember === false ? 'session' : 'local'

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('aries-logged-out')
    }

    setAuthSession(data.user, data.accessToken, data.expiresIn, mode)
    set({ token: data.accessToken, user: data.user, isAuthenticated: true })

    return {
      requires2fa: false as const,
      accessToken: data.accessToken,
      user: data.user,
      expiresIn: data.expiresIn,
    }
  },

  verify2fa: async (payload: Login2faPayload) => {
    const response = await login2fa(payload)

    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || '二次验证失败')
    }

    const data = response.data
    if (!data.accessToken || !data.user) {
      throw new Error('二次验证响应缺少 token 或用户信息')
    }

    setAuthSession(data.user, data.accessToken, data.expiresIn, getAuthPersistenceMode())
    set({ token: data.accessToken, user: data.user, isAuthenticated: true })
  },

  signOut: async () => {
    try {
      await logout()
    } catch {
      // logout request failures are non-critical
    }
    clearToken()
    clearStoredUser()
    set({ token: '', user: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    const token = getToken()
    if (!token) {
      set({ token: '', user: null, isAuthenticated: false })
      return false
    }

    get().hydrate()

    try {
      const data = await refreshSession()
      if (!data.accessToken || !data.user) {
        throw new Error('Session 恢复失败')
      }
      setAuthSession(data.user, data.accessToken, data.expiresIn, getAuthPersistenceMode())
      set({ token: data.accessToken, user: data.user, isAuthenticated: true })
      return true
    } catch {
      clearToken()
      clearStoredUser()
      set({ token: '', user: null, isAuthenticated: false })
      return false
    }
  },
}))
