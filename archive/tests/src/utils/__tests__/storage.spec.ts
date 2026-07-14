import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'
import {
  clearLegacyModuleEditorDraftStorage,
  clearStoredUser,
  clearToken,
  clearTokenExpiresAt,
  getAuthPersistenceMode,
  getListColumnSettings,
  getPersonalSettings,
  getStoredUser,
  getToken,
  getTokenExpiresAt,
  setAuthSession,
  setListColumnSettings,
  setPersonalSettings,
  setStoredUser,
} from '../storage'

const mockUser = { id: 1, loginName: 'admin', userName: 'Admin' }
const mockSettings = { fontSize: 14, layoutMode: 'sider' as const }
const mockColSettings = { orderedKeys: ['a', 'b'], hiddenKeys: ['c'] }

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearToken()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('clearLegacyModuleEditorDraftStorage', () => {
  it('removes only legacy module editor draft snapshots', () => {
    localStorage.setItem('aries-module-editor-draft:user:sales-order:new', '{}')
    localStorage.setItem('aries-token', 'keep-token')

    clearLegacyModuleEditorDraftStorage()

    expect(
      localStorage.getItem('aries-module-editor-draft:user:sales-order:new'),
    ).toBeNull()
    expect(localStorage.getItem('aries-token')).toBe('keep-token')
  })
})

describe('getStoredUser', () => {
  it('returns null when no user stored', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('returns user when valid JSON stored', () => {
    setStoredUser(mockUser)
    const result = getStoredUser()
    expect(result).toBeTruthy()
    expect(result!.id).toBe(1)
    expect(result!.loginName).toBe('admin')
  })

  it('returns null for malformed data (missing loginName)', () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: 1 }))
    expect(getStoredUser()).toBeNull()
  })

  it('returns null for non-object data', () => {
    localStorage.setItem(STORAGE_KEYS.user, '"just-a-string"')
    expect(getStoredUser()).toBeNull()
  })

  it('removes malformed JSON from localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.user, '{broken json}')
    expect(getStoredUser()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })

  it('reads user from session storage when session persistence is stored', () => {
    sessionStorage.setItem(STORAGE_KEYS.authPersistence, 'session')
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mockUser))

    expect(getStoredUser()?.loginName).toBe('admin')
  })

  it('removes malformed JSON from localStorage even when session mode is selected', () => {
    sessionStorage.setItem(STORAGE_KEYS.authPersistence, 'session')
    sessionStorage.setItem(STORAGE_KEYS.user, '{broken json}')
    localStorage.setItem(STORAGE_KEYS.user, 'legacy-user')

    expect(getStoredUser()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })
})

describe('getPersonalSettings', () => {
  it('returns null when no settings stored', () => {
    expect(getPersonalSettings()).toBeNull()
  })

  it('returns settings for valid object', () => {
    setPersonalSettings(mockSettings)
    const result = getPersonalSettings()
    expect(result).toBeTruthy()
    expect(result!.fontSize).toBe(14)
  })

  it('returns null for array data', () => {
    localStorage.setItem(STORAGE_KEYS.personalSettings, '[]')
    expect(getPersonalSettings()).toBeNull()
  })

  it('returns null for primitive settings data', () => {
    localStorage.setItem(STORAGE_KEYS.personalSettings, '"dark"')
    expect(getPersonalSettings()).toBeNull()
  })

  it('removes invalid settings JSON', () => {
    localStorage.setItem(STORAGE_KEYS.personalSettings, '{broken}')
    expect(getPersonalSettings()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toBeNull()
  })
})

describe('getListColumnSettings', () => {
  const pageKey = 'test-page'

  it('returns null when no settings stored', () => {
    expect(getListColumnSettings(pageKey)).toBeNull()
  })

  it('returns settings for valid structure', () => {
    setListColumnSettings(pageKey, mockColSettings)
    const result = getListColumnSettings(pageKey)
    expect(result).toBeTruthy()
    expect(result!.orderedKeys).toEqual(['a', 'b'])
    expect(result!.hiddenKeys).toEqual(['c'])
  })

  it('returns null when orderedKeys is not array', () => {
    localStorage.setItem(
      'aries-list-column-settings:anonymous:test-page',
      JSON.stringify({ orderedKeys: 'not-array', hiddenKeys: [] }),
    )
    expect(getListColumnSettings(pageKey)).toBeNull()
  })

  it('handles userKey correctly', () => {
    setListColumnSettings(pageKey, mockColSettings, 'user1')
    const result = getListColumnSettings(pageKey, 'user1')
    expect(result!.orderedKeys).toEqual(['a', 'b'])
  })

  it('trims userKey and falls back to anonymous when it is blank', () => {
    setListColumnSettings(pageKey, mockColSettings, ' user1 ')
    expect(getListColumnSettings(pageKey, 'user1')!.hiddenKeys).toEqual(['c'])

    setListColumnSettings('blank-page', mockColSettings, '   ')
    expect(getListColumnSettings('blank-page')!.orderedKeys).toEqual(['a', 'b'])
  })
})

describe('token management', () => {
  it('getToken returns empty string initially', () => {
    expect(getToken()).toBe('')
  })

  it('getTokenExpiresAt returns null when not set', () => {
    expect(getTokenExpiresAt()).toBeNull()
  })

  it('getTokenExpiresAt returns number from localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.tokenExpiresAt, '1234567890')
    expect(getTokenExpiresAt()).toBe(1234567890)
  })

  it('getTokenExpiresAt returns number from sessionStorage', () => {
    sessionStorage.setItem(STORAGE_KEYS.tokenExpiresAt, '9876543210')
    expect(getTokenExpiresAt()).toBe(9876543210)
  })

  it('getTokenExpiresAt returns null without window', () => {
    vi.stubGlobal('window', undefined)
    expect(getTokenExpiresAt()).toBeNull()
  })

  it('clearTokenExpiresAt removes from both storages', () => {
    localStorage.setItem(STORAGE_KEYS.tokenExpiresAt, '123')
    sessionStorage.setItem(STORAGE_KEYS.tokenExpiresAt, '456')
    clearTokenExpiresAt()
    expect(localStorage.getItem(STORAGE_KEYS.tokenExpiresAt)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.tokenExpiresAt)).toBeNull()
  })

  it('setAuthSession stores token and user in specified mode', () => {
    localStorage.setItem(STORAGE_KEYS.refreshToken, 'legacy-refresh')

    setAuthSession(mockUser, 'test-token', 3600, 'local')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('test-token')
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEYS.authPersistence)).toBe('local')
    expect(localStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull()
    expect(getToken()).toBe('test-token')
    expect(getStoredUser()!.loginName).toBe('admin')
  })

  it('setAuthSession stores in session mode', () => {
    setAuthSession(mockUser, 'session-token', 3600, 'session')
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('session-token')
    expect(sessionStorage.getItem(STORAGE_KEYS.authPersistence)).toBe('session')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('clearToken clears in-memory and storage', () => {
    setAuthSession(mockUser, 'tok', 3600, 'local')
    clearToken()
    expect(getToken()).toBe('')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('skips expired tokens on read', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)

    localStorage.setItem(STORAGE_KEYS.token, 'expired-token')
    localStorage.setItem(STORAGE_KEYS.tokenExpiresAt, String(6000))
    vi.setSystemTime(7000)

    expect(getToken()).toBe('')
  })

  it('reads a stored valid token into memory', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)

    localStorage.setItem(STORAGE_KEYS.token, 'stored-token')
    localStorage.setItem(STORAGE_KEYS.tokenExpiresAt, String(6000))

    expect(getToken()).toBe('stored-token')

    localStorage.removeItem(STORAGE_KEYS.token)
    expect(getToken()).toBe('stored-token')
  })

  it('reads a stored token without an expiry timestamp', async () => {
    vi.resetModules()
    localStorage.setItem(STORAGE_KEYS.token, 'token-without-expiry')
    const storage = await import('../storage')

    expect(storage.getToken()).toBe('token-without-expiry')
  })

  it('skips storage access without window', () => {
    vi.stubGlobal('window', undefined)

    expect(getToken()).toBe('')
    expect(() => clearToken()).not.toThrow()
  })

  it('keeps auth helpers inert when module loads without window', async () => {
    vi.resetModules()
    vi.stubGlobal('window', undefined)
    const storage = await import('../storage')

    expect(storage.getAuthPersistenceMode()).toBe('local')
    expect(storage.getToken()).toBe('')
    expect(storage.getStoredUser()).toBeNull()
    expect(storage.getTokenExpiresAt()).toBeNull()
    expect(() => storage.clearStoredUser()).not.toThrow()
    expect(() => storage.setStoredUser(mockUser)).not.toThrow()
    expect(() =>
      storage.setAuthSession(mockUser, 'token', 3600, 'local'),
    ).not.toThrow()
  })
})

describe('getAuthPersistenceMode', () => {
  it('defaults to local', () => {
    expect(getAuthPersistenceMode()).toBe('local')
  })

  it('returns session when session data exists', () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'some-token')
    expect(getAuthPersistenceMode()).toBe('session')
  })

  it('returns session when only session user exists', () => {
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mockUser))
    expect(getAuthPersistenceMode()).toBe('session')
  })

  it('returns local when local data exists', () => {
    localStorage.setItem(STORAGE_KEYS.token, 'some-token')
    expect(getAuthPersistenceMode()).toBe('local')
  })

  it('returns local when only local user exists', () => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mockUser))
    expect(getAuthPersistenceMode()).toBe('local')
  })

  it('uses stored persistence mode over storage data probes', () => {
    localStorage.setItem(STORAGE_KEYS.authPersistence, 'session')
    localStorage.setItem(STORAGE_KEYS.token, 'some-token')

    expect(getAuthPersistenceMode()).toBe('session')
  })

  it('ignores invalid stored persistence mode', () => {
    localStorage.setItem(STORAGE_KEYS.authPersistence, 'invalid')

    expect(getAuthPersistenceMode()).toBe('local')
  })
})

describe('setStoredUser', () => {
  it('stores user in localStorage by default', () => {
    setStoredUser(mockUser)
    const stored = localStorage.getItem(STORAGE_KEYS.user)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).loginName).toBe('admin')
  })

  it('stores user in session mode when session token exists', () => {
    setAuthSession(mockUser, 'session-token', 3600, 'session')
    const newUser = { id: 2, loginName: 'user2', userName: 'User 2' }
    setStoredUser(newUser)
    const stored = sessionStorage.getItem(STORAGE_KEYS.user)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).loginName).toBe('user2')
  })

  it('stores user in explicitly persisted session mode', () => {
    sessionStorage.setItem(STORAGE_KEYS.authPersistence, 'session')
    const newUser = { id: 2, loginName: 'user2', userName: 'User 2' }

    setStoredUser(newUser)

    expect(sessionStorage.getItem(STORAGE_KEYS.user)).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull()
  })
})

describe('clearStoredUser', () => {
  it('removes user from storage', () => {
    setStoredUser(mockUser)
    expect(getStoredUser()).toBeTruthy()
    clearStoredUser()
    expect(getStoredUser()).toBeNull()
  })
})

describe('getListColumnSettings edge cases', () => {
  it('returns null for malformed JSON in list column settings', () => {
    const pageKey = 'test-page-malformed'
    localStorage.setItem(
      `aries-list-column-settings:anonymous:${pageKey}`,
      '{broken json}',
    )
    expect(getListColumnSettings(pageKey)).toBeNull()
  })

  it('returns null when hiddenKeys is not array', () => {
    const pageKey = 'test-page-hidden'
    localStorage.setItem(
      `aries-list-column-settings:anonymous:${pageKey}`,
      JSON.stringify({ orderedKeys: ['a'], hiddenKeys: 'not-array' }),
    )
    expect(getListColumnSettings(pageKey)).toBeNull()
  })

  it('handles empty userKey by defaulting to anonymous', () => {
    setListColumnSettings('test-page', mockColSettings, '')
    const result = getListColumnSettings('test-page', '')
    expect(result).toBeTruthy()
    expect(result!.orderedKeys).toEqual(['a', 'b'])
  })
})
