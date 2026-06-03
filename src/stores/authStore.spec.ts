import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import {
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setAuthSession,
} from '@/utils/storage'
import { ERROR_CODE } from '@/constants/error-codes'

const mockUser = {
  id: 1,
  loginName: 'admin',
  userName: 'Admin',
  roleName: '管理员',
  permissions: [],
}

const loginMock = vi.fn()
const login2faMock = vi.fn()
const logoutMock = vi.fn()
const refreshSessionMock = vi.fn()

vi.mock('@/api/auth', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  login2fa: (...args: unknown[]) => login2faMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
  refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
}))

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
  },
  t: (key: string) => key,
}))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearToken()
  useAuthStore.setState({
    token: '',
    user: null,
    isAuthenticated: false,
    authReady: false,
  })
  vi.clearAllMocks()
})

describe('authStore hydration', () => {
  it('keeps a stored user authenticated while access token is restored', () => {
    setStoredUser(mockUser)

    useAuthStore.getState().hydrate()

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.user?.loginName).toBe('admin')
    expect(state.isAuthenticated).toBe(true)
    expect(state.authReady).toBe(false)
  })

  it('hydrate clears auth when no stored data', () => {
    useAuthStore.getState().hydrate()

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})

describe('authStore signIn', () => {
  it('signs in successfully with valid credentials', async () => {
    loginMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: {
        requires2fa: false,
        accessToken: 'test-token',
        user: mockUser,
        expiresIn: 3600,
      },
    })

    await act(async () => {
      const result = await useAuthStore.getState().signIn({
        loginName: 'admin',
        password: 'pass',
        remember: true,
      })
      expect(result.requires2fa).toBe(false)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('test-token')
    expect(state.user?.loginName).toBe('admin')
    expect(state.isAuthenticated).toBe(true)
    expect(state.authReady).toBe(true)
  })

  it('throws on API error code', async () => {
    loginMock.mockResolvedValue({
      code: ERROR_CODE.UNAUTHORIZED,
      message: '用户名或密码错误',
      data: null,
    })

    await expect(
      useAuthStore.getState().signIn({
        loginName: 'admin',
        password: 'wrong',
      }),
    ).rejects.toThrow('用户名或密码错误')
  })

  it('returns requires2fa when step 2 needed', async () => {
    loginMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: {
        requires2fa: true,
        tempToken: '2fa-temp-token',
      },
    })

    const result = await useAuthStore.getState().signIn({
      loginName: 'admin',
      password: 'pass',
    })

    expect(result.requires2fa).toBe(true)
    expect((result as { tempToken: string }).tempToken).toBe('2fa-temp-token')
  })

  it('throws when 2fa tempToken is missing', async () => {
    loginMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: {
        requires2fa: true,
        tempToken: '',
      },
    })

    await expect(
      useAuthStore.getState().signIn({
        loginName: 'admin',
        password: 'pass',
      }),
    ).rejects.toThrow('auth.error.missing2faToken')
  })

  it('throws when accessToken or user is missing', async () => {
    loginMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: {
        requires2fa: false,
        accessToken: '',
        user: null,
        expiresIn: 0,
      },
    })

    await expect(
      useAuthStore.getState().signIn({
        loginName: 'admin',
        password: 'pass',
      }),
    ).rejects.toThrow('auth.error.missingTokenOrUser')
  })
})

describe('authStore verify2fa', () => {
  it('verifies 2fa successfully', async () => {
    login2faMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: {
        accessToken: '2fa-token',
        user: mockUser,
        expiresIn: 3600,
      },
    })

    await act(async () => {
      const result = await useAuthStore.getState().verify2fa({
        tempToken: 'temp',
        code: '123456',
        remember: true,
      })
      expect(result.accessToken).toBe('2fa-token')
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('2fa-token')
    expect(state.isAuthenticated).toBe(true)
  })

  it('throws on 2fa API error', async () => {
    login2faMock.mockResolvedValue({
      code: ERROR_CODE.UNAUTHORIZED,
      message: '验证码错误',
      data: null,
    })

    await expect(
      useAuthStore.getState().verify2fa({
        tempToken: 'temp',
        code: '000000',
      }),
    ).rejects.toThrow('验证码错误')
  })

  it('throws when 2fa response missing token or user', async () => {
    login2faMock.mockResolvedValue({
      code: ERROR_CODE.SUCCESS,
      message: '',
      data: { accessToken: '', user: null, expiresIn: 0 },
    })

    await expect(
      useAuthStore.getState().verify2fa({
        tempToken: 'temp',
        code: '123456',
      }),
    ).rejects.toThrow('auth.error.missing2faResponseTokenOrUser')
  })
})

describe('authStore signOut', () => {
  it('clears auth state on sign out', async () => {
    logoutMock.mockResolvedValue(undefined)
    setAuthSession(mockUser, 'test-token', 3600, 'local')
    useAuthStore.setState({
      token: 'test-token',
      user: mockUser,
      isAuthenticated: true,
      authReady: true,
    })

    await act(async () => {
      await useAuthStore.getState().signOut()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.authReady).toBe(true)
  })

  it('handles logout API error gracefully', async () => {
    logoutMock.mockRejectedValue(new Error('Network error'))
    useAuthStore.setState({
      token: 'test-token',
      user: mockUser,
      isAuthenticated: true,
      authReady: true,
    })

    await act(async () => {
      await useAuthStore.getState().signOut()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.isAuthenticated).toBe(false)
  })
})

describe('authStore restoreSession', () => {
  it('returns false when no stored user', async () => {
    const result = await useAuthStore.getState().restoreSession()
    expect(result).toBe(false)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.authReady).toBe(true)
  })

  it('restores session successfully from API', async () => {
    setAuthSession(mockUser, 'stored-token', 3600, 'local')
    useAuthStore.setState({
      token: 'stored-token',
      user: mockUser,
      isAuthenticated: true,
      authReady: false,
    })

    refreshSessionMock.mockResolvedValue({
      accessToken: 'new-token',
      user: mockUser,
      expiresIn: 7200,
    })

    await act(async () => {
      const result = await useAuthStore.getState().restoreSession()
      expect(result).toBe(true)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('new-token')
    expect(state.isAuthenticated).toBe(true)
    expect(state.authReady).toBe(true)
  })

  it('falls back to stored token when API fails', async () => {
    setAuthSession(mockUser, 'stored-token', 3600, 'local')
    useAuthStore.setState({
      token: 'stored-token',
      user: mockUser,
      isAuthenticated: true,
      authReady: false,
    })

    refreshSessionMock.mockRejectedValue(new Error('API error'))

    await act(async () => {
      const result = await useAuthStore.getState().restoreSession()
      expect(result).toBe(true)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('stored-token')
    expect(state.isAuthenticated).toBe(true)
    expect(state.authReady).toBe(true)
  })

  it('clears auth when both API and fallback fail', async () => {
    setAuthSession(mockUser, '', 0, 'local')
    useAuthStore.setState({
      token: '',
      user: mockUser,
      isAuthenticated: true,
      authReady: false,
    })

    refreshSessionMock.mockRejectedValue(new Error('API error'))

    await act(async () => {
      const result = await useAuthStore.getState().restoreSession()
      expect(result).toBe(false)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.authReady).toBe(true)
  })
})
