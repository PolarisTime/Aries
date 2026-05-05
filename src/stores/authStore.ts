import { create } from 'zustand'
import { login, login2fa, logout, refreshSession } from '@/api/auth'
import { reloadCarrierOptions } from '@/api/carrier-options'
import { reloadCustomerOptions } from '@/api/customer-options'
import { reloadMaterialCategories } from '@/api/material-categories'
import { reloadSupplierOptions } from '@/api/supplier-options'
import { reloadWarehouseOptions } from '@/api/warehouse-options'
import { ERROR_CODE } from '@/constants/error-codes'
import type {
  LoginPayload,
  Login2faPayload,
  LoginResponseData,
  LoginUser,
} from '@/types/auth'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSystemMenuStore } from '@/stores/systemMenuStore'
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
  verify2fa: (payload: Login2faPayload) => Promise<LoginResponseData>
  signOut: () => Promise<void>
  restoreSession: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken() || '',
  user: getStoredUser(),
  isAuthenticated: Boolean(getToken()),

  hydrate: () => {
    const nextToken = getToken() || ''
    const nextUser = getStoredUser()
    set({
      token: nextToken,
      user: nextUser,
      isAuthenticated: Boolean(nextToken),
    })
    usePermissionStore.getState().syncFromUser(nextUser)
    if (nextToken && nextUser) {
      void useSystemMenuStore.getState().loadMenus().catch(() => {
        // menu loading failures should not block app bootstrap
      })
    } else {
      useSystemMenuStore.getState().clearMenus()
    }
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
    usePermissionStore.getState().syncFromUser(data.user)
    void useSystemMenuStore.getState().loadMenus(true).catch(() => {
      // menu loading failures should not block sign-in
    })
    reloadSupplierOptions()
    reloadCustomerOptions()
    reloadCarrierOptions()
    reloadWarehouseOptions()
    reloadMaterialCategories()

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

    const mode: AuthPersistenceMode = payload.remember === false ? 'session' : 'local'
    setAuthSession(data.user, data.accessToken, data.expiresIn, mode)
    set({ token: data.accessToken, user: data.user, isAuthenticated: true })
    usePermissionStore.getState().syncFromUser(data.user)
    void useSystemMenuStore.getState().loadMenus(true).catch(() => {
      // menu loading failures should not block 2FA completion
    })
    reloadSupplierOptions()
    reloadCustomerOptions()
    reloadCarrierOptions()
    reloadWarehouseOptions()
    reloadMaterialCategories()
    return data
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
    usePermissionStore.getState().clearPermissions()
    useSystemMenuStore.getState().clearMenus()
  },

  restoreSession: async () => {
    get().hydrate()

    const token = get().token
    const user = get().user
    if (!token) {
      set({ token: '', user: null, isAuthenticated: false })
      usePermissionStore.getState().clearPermissions()
      useSystemMenuStore.getState().clearMenus()
      return false
    }

    if (token && user) {
      return true
    }

    try {
      const data = await refreshSession()
      if (!data.accessToken || !data.user) {
        throw new Error('Session 恢复失败')
      }
      setAuthSession(data.user, data.accessToken, data.expiresIn, getAuthPersistenceMode())
      set({ token: data.accessToken, user: data.user, isAuthenticated: true })
      usePermissionStore.getState().syncFromUser(data.user)
      void useSystemMenuStore.getState().loadMenus(true).catch(() => {
        // menu loading failures should not block session restore
      })
      reloadSupplierOptions()
      reloadCustomerOptions()
      reloadCarrierOptions()
      reloadWarehouseOptions()
      reloadMaterialCategories()
      return true
    } catch {
      clearToken()
      clearStoredUser()
      set({ token: '', user: null, isAuthenticated: false })
      usePermissionStore.getState().clearPermissions()
      useSystemMenuStore.getState().clearMenus()
      return false
    }
  },
}))
