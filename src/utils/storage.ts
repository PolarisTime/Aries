import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginUser } from '@/types/auth'
import type { ListColumnSettings } from '@/types/module-page'

export interface PersonalSettings {
  fontSize?: number
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

  const raw = localStorage.getItem(STORAGE_KEYS.authPersistence)
    || sessionStorage.getItem(STORAGE_KEYS.authPersistence)

  return raw === 'local' || raw === 'session' ? raw : null
}

function setStoredPersistenceMode(mode: AuthPersistenceMode) {
  if (typeof window === 'undefined') {
    return
  }

  clearStorageItem(STORAGE_KEYS.authPersistence)
  getStorage(mode).setItem(STORAGE_KEYS.authPersistence, mode)
}

function resolvePersistenceMode(preferred?: AuthPersistenceMode): AuthPersistenceMode {
  if (preferred) {
    return preferred
  }

  const storedMode = getStoredPersistenceMode()
  if (storedMode) {
    return storedMode
  }

  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem(STORAGE_KEYS.token) || sessionStorage.getItem(STORAGE_KEYS.user)) {
      return 'session'
    }
    if (localStorage.getItem(STORAGE_KEYS.token) || localStorage.getItem(STORAGE_KEYS.user)) {
      return 'local'
    }
  }

  return 'local'
}

export function getToken() {
  if (typeof window === 'undefined') {
    return accessToken
  }

  if (!accessToken) {
    const mode = resolvePersistenceMode()
    accessToken = getStorage(mode).getItem(STORAGE_KEYS.token) || ''
  }
  return accessToken
}

export function setToken(token: string, mode?: AuthPersistenceMode) {
  const persistenceMode = resolvePersistenceMode(mode)
  accessToken = token
  clearStorageItem(STORAGE_KEYS.token)
  getStorage(persistenceMode).setItem(STORAGE_KEYS.token, token)
  setStoredPersistenceMode(persistenceMode)
  clearLegacyAuthStorage()
}

export function clearToken() {
  accessToken = ''
  clearStorageItem(STORAGE_KEYS.token)
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
  clearStorageItem(STORAGE_KEYS.authPersistence)
  clearLegacyAuthStorage()
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
    return JSON.parse(raw) as LoginUser
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

export function setAuthSession(user: LoginUser, token: string, expiresIn: number, mode: AuthPersistenceMode) {
  accessToken = token
  clearStorageItem(STORAGE_KEYS.token)
  clearStorageItem(STORAGE_KEYS.user)
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
  getStorage(mode).setItem(STORAGE_KEYS.token, token)
  getStorage(mode).setItem(STORAGE_KEYS.user, JSON.stringify(user))
  getStorage(mode).setItem(STORAGE_KEYS.tokenExpiresAt, String(Date.now() + expiresIn * 1000))
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
    return JSON.parse(raw) as PersonalSettings
  } catch {
    localStorage.removeItem(STORAGE_KEYS.personalSettings)
    return null
  }
}

export function setPersonalSettings(settings: PersonalSettings) {
  localStorage.setItem(STORAGE_KEYS.personalSettings, JSON.stringify(settings))
}

function getListColumnSettingsKey(pageKey: string) {
  return `${STORAGE_KEYS.listColumnSettingsPrefix}${pageKey}`
}

export function getListColumnSettings(pageKey: string) {
  const raw = localStorage.getItem(getListColumnSettingsKey(pageKey))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as ListColumnSettings
  } catch {
    localStorage.removeItem(getListColumnSettingsKey(pageKey))
    return null
  }
}

export function setListColumnSettings(pageKey: string, settings: ListColumnSettings) {
  localStorage.setItem(getListColumnSettingsKey(pageKey), JSON.stringify(settings))
}

export function clearListColumnSettings(pageKey: string) {
  localStorage.removeItem(getListColumnSettingsKey(pageKey))
}

export function getTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEYS.tokenExpiresAt)
    || sessionStorage.getItem(STORAGE_KEYS.tokenExpiresAt)
  return raw ? Number(raw) : null
}

export function clearTokenExpiresAt() {
  clearStorageItem(STORAGE_KEYS.tokenExpiresAt)
}
