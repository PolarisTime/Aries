import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginUser } from '@/types/auth'
import type { ListColumnSettings } from '@/types/module-page'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface PersonalSettings {
  fontSize?: number
  layoutMode?: 'sider' | 'top'
  themeMode?: ThemeMode
}


export type AuthPersistenceMode = 'local' | 'session'

let accessToken = ''

function getStorage(mode: AuthPersistenceMode) {
  return mode === 'session' ? sessionStorage : localStorage
}

function clearLegacyAuthStorage() {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
}

function clearStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

function getStoredPersistenceMode(): AuthPersistenceMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw =
    localStorage.getItem(STORAGE_KEYS.authPersistence) ||
    sessionStorage.getItem(STORAGE_KEYS.authPersistence)

  return raw === 'local' || raw === 'session' ? raw : null
}

function setStoredPersistenceMode(mode: AuthPersistenceMode) {
  if (typeof window === 'undefined') {
    return
  }

  clearStorageItem(STORAGE_KEYS.authPersistence)
  getStorage(mode).setItem(STORAGE_KEYS.authPersistence, mode)
}

function resolvePersistenceMode(
  preferred?: AuthPersistenceMode,
): AuthPersistenceMode {
  if (preferred) {
    return preferred
  }

  const storedMode = getStoredPersistenceMode()
  if (storedMode) {
    return storedMode
  }

  if (typeof window !== 'undefined') {
    if (
      sessionStorage.getItem(STORAGE_KEYS.token) ||
      sessionStorage.getItem(STORAGE_KEYS.user)
    ) {
      return 'session'
    }
    if (
      localStorage.getItem(STORAGE_KEYS.token) ||
      localStorage.getItem(STORAGE_KEYS.user)
    ) {
      return 'local'
    }
  }

  return 'local'
}

function readStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  const mode = resolvePersistenceMode()
  const storage = getStorage(mode)
  const token = storage.getItem(STORAGE_KEYS.token) || ''
  if (!token) {
    return ''
  }

  const expiresAt = Number(storage.getItem(STORAGE_KEYS.tokenExpiresAt) || 0)
  if (expiresAt > 0 && expiresAt <= Date.now()) {
    clearToken()
    return ''
  }

  accessToken = token
  return token
}

export function getToken() {
  return accessToken || readStoredToken()
}


export function clearToken() {
  accessToken = ''
  clearStorageItem(STORAGE_KEYS.token)
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
}

export function getStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  const mode = resolvePersistenceMode()
  const raw = getStorage(mode).getItem(STORAGE_KEYS.user)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.id !== 'undefined' &&
      typeof parsed.loginName === 'string'
    ) {
      return parsed as LoginUser
    }
    return null
  } catch {
    localStorage.removeItem(STORAGE_KEYS.user)
    return null
  }
}

export function setStoredUser(user: LoginUser) {
  const persistenceMode = resolvePersistenceMode()
  clearStorageItem(STORAGE_KEYS.user)
  getStorage(persistenceMode).setItem(STORAGE_KEYS.user, JSON.stringify(user))
  setStoredPersistenceMode(persistenceMode)
}

export function clearStoredUser() {
  clearStorageItem(STORAGE_KEYS.user)
}

export function setAuthSession(
  user: LoginUser,
  token: string,
  expiresIn: number,
  mode: AuthPersistenceMode,
) {
  accessToken = token
  clearStorageItem(STORAGE_KEYS.token)
  clearStorageItem(STORAGE_KEYS.user)
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
  getStorage(mode).setItem(STORAGE_KEYS.token, token)
  getStorage(mode).setItem(STORAGE_KEYS.user, JSON.stringify(user))
  getStorage(mode).setItem(
    STORAGE_KEYS.tokenExpiresAt,
    String(Date.now() + expiresIn * 1000),
  )
  setStoredPersistenceMode(mode)
  clearLegacyAuthStorage()
}

export function getAuthPersistenceMode() {
  return resolvePersistenceMode()
}

export function getPersonalSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.personalSettings)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PersonalSettings
    }
    return null
  } catch {
    localStorage.removeItem(STORAGE_KEYS.personalSettings)
    return null
  }
}

export function setPersonalSettings(settings: PersonalSettings) {
  localStorage.setItem(STORAGE_KEYS.personalSettings, JSON.stringify(settings))
}

function getListColumnSettingsKey(pageKey: string, userKey?: string) {
  const normalizedUserKey = String(userKey || 'anonymous').trim() || 'anonymous'
  return `${STORAGE_KEYS.listColumnSettingsPrefix}${normalizedUserKey}:${pageKey}`
}

export function getListColumnSettings(pageKey: string, userKey?: string) {
  const raw = localStorage.getItem(getListColumnSettingsKey(pageKey, userKey))
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      Array.isArray(parsed.orderedKeys) &&
      Array.isArray(parsed.hiddenKeys)
    ) {
      return parsed as ListColumnSettings
    }
    return null
  } catch {
    localStorage.removeItem(getListColumnSettingsKey(pageKey, userKey))
    return null
  }
}

export function setListColumnSettings(
  pageKey: string,
  settings: ListColumnSettings,
  userKey?: string,
) {
  localStorage.setItem(
    getListColumnSettingsKey(pageKey, userKey),
    JSON.stringify(settings),
  )
}






export function getTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw =
    localStorage.getItem(STORAGE_KEYS.tokenExpiresAt) ||
    sessionStorage.getItem(STORAGE_KEYS.tokenExpiresAt)
  return raw ? Number(raw) : null
}

export function clearTokenExpiresAt() {
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
}
