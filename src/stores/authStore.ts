import { create } from 'zustand'
import { ERROR_CODE } from '@/constants/error-codes'
import type {
  Login2faPayload,
  LoginPayload,
  LoginResponseData,
  LoginUser,
} from '@/types/auth'
import {
  type AuthPersistenceMode,
  clearStoredUser,
  clearToken,
  getAuthPersistenceMode,
  getStoredUser,
  getToken,
  setAuthSession,
} from '@/utils/storage'

async function loadAuthApi() {
  return import('@/api/auth')
}

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

function isStep2(data: LoginResult): data is LoginStep2 {
  return data.requires2fa === true
}

interface AuthState {
  token: string
  user: LoginUser | null
  isAuthenticated: boolean
  authReady: boolean
  hydrate: () => void
  signIn: (payload: LoginPayload) => Promise<LoginResult>
  verify2fa: (payload: Login2faPayload) => Promise<LoginResponseData>
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
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('aries-logged-out')
  }
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
      throw new Error(response.message || '登录失败')
    }
    const data = response.data as LoginResult
    if (isStep2(data)) {
      if (!data.tempToken) throw new Error('登录响应缺少二次验证令牌')
      return { requires2fa: true, tempToken: data.tempToken }
    }
    if (!data.accessToken || !data.user) {
      throw new Error('登录响应缺少 token 或用户信息')
    }
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
    return {
      requires2fa: false,
      accessToken: data.accessToken,
      user: data.user,
      expiresIn: data.expiresIn,
    }
  },

  verify2fa: async (payload: Login2faPayload) => {
    const { login2fa } = await loadAuthApi()
    const response = await login2fa(payload)
    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || '二次验证失败')
    }
    const data = response.data
    if (!data.accessToken || !data.user) {
      throw new Error('二次验证响应缺少 token 或用户信息')
    }
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
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
    try {
      const { refreshSession } = await loadAuthApi()
      const data = await refreshSession()
      if (!data.accessToken || !data.user) throw new Error('Session 恢复失败')
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
      // refresh token 已过期 → 清除登录态
      set({ token: '', user: null, isAuthenticated: false, authReady: true })
      return false
    }
  },
}))
