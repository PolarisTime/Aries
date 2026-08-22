import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from '@/components/table/ResizableHeaderCell'
import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginUser } from '@/shared/schemas'
import type { ThemeMode } from '@/stores/uiSettingsStore'
import type { ListColumnSettings } from '@/types/module-page'

export type { ThemeMode }

export type AuthPersistenceMode = 'local' | 'session'

let accessToken = ''

const LEGACY_MODULE_EDITOR_DRAFT_STORAGE_PREFIX = 'aries-module-editor-draft:'

export function clearLegacyModuleEditorDraftStorage() {
  if (typeof window === 'undefined') {
    return
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(LEGACY_MODULE_EDITOR_DRAFT_STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  }
}

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

function resolvePersistenceMode(): AuthPersistenceMode {
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

export function clearStoredUser() {
  clearStorageItem(STORAGE_KEYS.user)
}

export function setStoredUser(user: LoginUser) {
  if (typeof window === 'undefined') {
    return
  }
  getStorage(resolvePersistenceMode()).setItem(
    STORAGE_KEYS.user,
    JSON.stringify(user),
  )
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

function getListColumnSettingsKey(pageKey: string, userKey?: string) {
  const normalizedUserKey = String(userKey || 'anonymous').trim() || 'anonymous'
  return `${STORAGE_KEYS.listColumnSettingsPrefix}${normalizedUserKey}:${pageKey}`
}

/** 多标签页持久化 key：按登录用户隔离 */
export function getLayoutTabsStorageKey(userKey?: string) {
  const normalizedUserKey = String(userKey || 'anonymous').trim() || 'anonymous'
  return `${STORAGE_KEYS.layoutTabsPrefix}${normalizedUserKey}`
}

function normalizeStoredColumnSizes(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const width = Number(raw)
    if (
      key &&
      Number.isFinite(width) &&
      width >= MIN_COLUMN_WIDTH &&
      width <= MAX_COLUMN_WIDTH
    ) {
      result[key] = Math.round(width)
    }
  }
  return result
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
      return {
        ...parsed,
        // 旧数据无 columnSizes 时归一化为空对象；坏值/超界值过滤，保证拖拽前状态合法
        columnSizes: normalizeStoredColumnSizes(parsed.columnSizes),
      } as ListColumnSettings
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
