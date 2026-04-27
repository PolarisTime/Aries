import { createPinia, setActivePinia } from 'pinia'
import { STORAGE_KEYS } from '@/constants/storage'
import { useAuthStore } from '@/stores/auth'

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  login2fa: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  login: authApiMocks.login,
  login2fa: authApiMocks.login2fa,
  logout: authApiMocks.logout,
  refreshSession: authApiMocks.refreshSession,
}))

describe('auth store persistence', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const { clearStoredUser, clearToken } = await import('@/utils/storage')
    clearToken()
    clearStoredUser()
    localStorage.clear()
    sessionStorage.clear()
    authApiMocks.login.mockReset()
    authApiMocks.login2fa.mockReset()
    authApiMocks.logout.mockReset()
    authApiMocks.refreshSession.mockReset()
  })

  it('persists login to localStorage when remember is enabled', async () => {
    authApiMocks.login.mockResolvedValue({
      code: 0,
      data: {
        accessToken: 'local-token',
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: {
          id: 1,
          loginName: 'admin',
          userName: '系统管理员',
        },
      },
    })

    const store = useAuthStore()
    await store.signIn({
      loginName: 'admin',
      password: '123456',
      remember: true,
    })

    expect(store.token).toBe('local-token')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('local-token')
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.authPersistence)).toBe('local')
  })

  it('persists login to sessionStorage when remember is disabled', async () => {
    authApiMocks.login.mockResolvedValue({
      code: 0,
      data: {
        accessToken: 'session-token',
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: {
          id: 2,
          loginName: 'leo',
          userName: 'Leo',
        },
      },
    })

    const store = useAuthStore()
    await store.signIn({
      loginName: 'leo',
      password: '123456',
      remember: false,
    })

    expect(store.token).toBe('session-token')
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('session-token')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.authPersistence)).toBe('session')
  })

  it('preserves remember preference during 2fa verification', async () => {
    authApiMocks.login2fa.mockResolvedValue({
      code: 0,
      data: {
        accessToken: '2fa-token',
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: {
          id: 3,
          loginName: 'totp-user',
          userName: 'Totp User',
        },
      },
    })

    const store = useAuthStore()
    await store.verify2fa({
      tempToken: 'temp-token',
      totpCode: '123456',
      remember: false,
    })

    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('2fa-token')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('restores from persisted local session before calling refresh api', async () => {
    localStorage.setItem(STORAGE_KEYS.token, 'persisted-token')
    localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({
        id: 9,
        loginName: 'persisted-admin',
        userName: 'Persisted Admin',
      }),
    )
    localStorage.setItem(STORAGE_KEYS.authPersistence, 'local')

    const store = useAuthStore()
    const restored = await store.restoreSession()

    expect(restored).toBe(true)
    expect(store.token).toBe('persisted-token')
    expect(store.user).toMatchObject({
      loginName: 'persisted-admin',
    })
    expect(authApiMocks.refreshSession).not.toHaveBeenCalled()
  })
})
