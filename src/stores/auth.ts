import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { login, logout } from '@/api/auth'
import type { LoginPayload, LoginUser } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken() || '')
  const user = ref<LoginUser | null>(getStoredUser())
  const isAuthenticated = computed(() => Boolean(token.value))

  function hydrate() {
    token.value = getToken() || ''
    user.value = getStoredUser()
  }

  async function signIn(payload: LoginPayload) {
    const response = await login(payload)

    if (response.code !== 200 || response.data.msgTip !== 'user can login') {
      throw new Error(response.message || response.data.msgTip || '登录失败')
    }

    if (!response.data.token || !response.data.user) {
      throw new Error('登录响应缺少 token 或用户信息')
    }

    token.value = response.data.token
    user.value = response.data.user
    setToken(response.data.token)
    setStoredUser(response.data.user)

    return response.data
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      token.value = ''
      user.value = null
      clearToken()
      clearStoredUser()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    hydrate,
    signIn,
    signOut,
  }
})
