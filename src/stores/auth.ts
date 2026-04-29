import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { login, login2fa, logout, refreshSession } from '@/api/auth'
import { AUTH_STATE_CHANGED_EVENT } from '@/constants/auth'
import { ERROR_CODE } from '@/constants/error-codes'
import type { LoginPayload, LoginResponseData, LoginUser, Login2faPayload } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  type AuthPersistenceMode,
  getAuthPersistenceMode,
  getStoredUser,
  getToken,
  setAuthSession,
} from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken() || '')
  const user = ref<LoginUser | null>(getStoredUser())
  const isAuthenticated = computed(() => Boolean(token.value))

  function hydrate() {
    token.value = getToken() || ''
    user.value = getStoredUser()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, hydrate)
  }

  function applyLoginResult(data: LoginResponseData, mode?: AuthPersistenceMode) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('aries-logged-out')
    }
    token.value = data.accessToken
    user.value = data.user
    setAuthSession(data.user, data.accessToken, mode || getAuthPersistenceMode())
  }

  async function signIn(payload: LoginPayload) {
    const response = await login(payload)

    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || '登录失败')
    }

    if ('requires2fa' in response.data && response.data.requires2fa) {
      if (!response.data.tempToken) {
        throw new Error('登录响应缺少二次验证令牌')
      }
      return {
        requires2fa: true as const,
        tempToken: response.data.tempToken,
      }
    }

    if (
      !('accessToken' in response.data) ||
      !response.data.accessToken ||
      !response.data.user
    ) {
      throw new Error('登录响应缺少 token 或用户信息')
    }

    applyLoginResult(response.data, payload.remember === false ? 'session' : 'local')

    return {
      requires2fa: false as const,
      ...response.data,
    }
  }

  async function verify2fa(payload: Login2faPayload) {
    const response = await login2fa(payload)

    if (response.code !== ERROR_CODE.SUCCESS) {
      throw new Error(response.message || '二次验证失败')
    }

    if (!response.data.accessToken || !response.data.user) {
      throw new Error('二次验证响应缺少 token 或用户信息')
    }

    applyLoginResult(response.data, payload.remember === false ? 'session' : 'local')

    return response.data
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('aries-logged-out', '1')
      }
      token.value = ''
      user.value = null
      clearToken()
      clearStoredUser()
    }
  }

  async function restoreSession() {
    hydrate()
    if (token.value && user.value) {
      return true
    }

    try {
      const response = await refreshSession()
      if (response.code !== ERROR_CODE.SUCCESS || !response.data?.accessToken || !response.data?.user) {
        throw new Error(response.message || '恢复登录状态失败')
      }
      applyLoginResult(response.data)
      return true
    } catch (error: unknown) {
      if (error instanceof Error && error.message !== '取消请求') {
        console.error('恢复登录状态失败', error)
      }
      token.value = ''
      user.value = null
      clearToken()
      clearStoredUser()
      return false
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    hydrate,
    signIn,
    verify2fa,
    signOut,
    restoreSession,
  }
})
