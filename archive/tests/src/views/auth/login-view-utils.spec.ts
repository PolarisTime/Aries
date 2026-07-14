import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

describe('login-view-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saveTotpSession saves to sessionStorage', async () => {
    const { saveTotpSession } = await import('@/views/auth/login-view-utils')
    const deadline = Date.now() + 300000
    saveTotpSession('token123', deadline, 'admin', false)
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'aries-totp-session',
      JSON.stringify({
        token: 'token123',
        deadline,
        loginName: 'admin',
        remember: false,
      }),
    )
  })

  it('clearTotpSession removes from sessionStorage', async () => {
    const { clearTotpSession } = await import('@/views/auth/login-view-utils')
    clearTotpSession()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
      'aries-totp-session',
    )
  })

  it('restoreTotpSession returns null when no session', async () => {
    mockSessionStorage.getItem.mockReturnValue(null)
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')
    expect(restoreTotpSession()).toBeNull()
  })

  it('restoreTotpSession returns session when valid', async () => {
    const futureDeadline = Date.now() + 300000
    mockSessionStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        deadline: futureDeadline,
        loginName: 'admin',
        remember: false,
      }),
    )
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')
    const result = restoreTotpSession()
    expect(result).toEqual({
      token: 'test-token',
      deadline: futureDeadline,
      loginName: 'admin',
      remember: false,
    })
  })

  it('restoreTotpSession defaults legacy sessions to non-persistent login', async () => {
    const futureDeadline = Date.now() + 300000
    mockSessionStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'legacy-token',
        deadline: futureDeadline,
        loginName: 'legacy-user',
      }),
    )
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')

    expect(restoreTotpSession()).toEqual({
      token: 'legacy-token',
      deadline: futureDeadline,
      loginName: 'legacy-user',
      remember: false,
    })
  })

  it('restoreTotpSession returns null when expired', async () => {
    const pastDeadline = Date.now() - 1000
    mockSessionStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        deadline: pastDeadline,
        loginName: 'admin',
      }),
    )
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')
    expect(restoreTotpSession()).toBeNull()
    expect(mockSessionStorage.removeItem).toHaveBeenCalled()
  })

  it('restoreTotpSession returns null on malformed data', async () => {
    mockSessionStorage.getItem.mockReturnValue('invalid json')
    const { restoreTotpSession } = await import('@/views/auth/login-view-utils')
    expect(restoreTotpSession()).toBeNull()
  })

  it('requiresForcedTotpSetup returns true when forceTotpSetup is true and totpEnabled is false', async () => {
    const { requiresForcedTotpSetup } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(
      requiresForcedTotpSetup({
        forceTotpSetup: true,
        totpEnabled: false,
      } as never),
    ).toBe(true)
  })

  it('requiresForcedTotpSetup returns false when totpEnabled is true', async () => {
    const { requiresForcedTotpSetup } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(
      requiresForcedTotpSetup({
        forceTotpSetup: true,
        totpEnabled: true,
      } as never),
    ).toBe(false)
  })

  it('requiresForcedTotpSetup returns false for null user', async () => {
    const { requiresForcedTotpSetup } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(requiresForcedTotpSetup(null)).toBe(false)
  })

  it('buildPostLoginTarget returns redirect path for normal user', async () => {
    const { buildPostLoginTarget } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(buildPostLoginTarget(null)).toBe('/dashboard')
  })

  it('buildPostLoginTarget uses safe redirect query path', async () => {
    window.history.replaceState(
      null,
      '',
      '/login?redirect=%2Fmodules%3Ftab%3Dsales',
    )
    const { buildPostLoginTarget } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(buildPostLoginTarget(null)).toBe('/modules?tab=sales')
  })

  it('buildPostLoginTarget falls back when redirect is not a local path', async () => {
    window.history.replaceState(
      null,
      '',
      '/login?redirect=https%3A%2F%2Fevil.example',
    )
    const { buildPostLoginTarget } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(buildPostLoginTarget(null)).toBe('/dashboard')
  })

  it('buildPostLoginTarget falls back when window is unavailable', async () => {
    vi.stubGlobal('window', undefined)
    const { buildPostLoginTarget } = await import(
      '@/views/auth/login-view-utils'
    )
    expect(buildPostLoginTarget(null)).toBe('/dashboard')
  })

  it('buildPostLoginTarget returns setup-2fa path when forced', async () => {
    const { buildPostLoginTarget } = await import(
      '@/views/auth/login-view-utils'
    )
    const result = buildPostLoginTarget({
      forceTotpSetup: true,
      totpEnabled: false,
    } as never)
    expect(result).toContain('/setup-2fa')
  })
})
