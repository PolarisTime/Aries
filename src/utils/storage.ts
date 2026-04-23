import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginUser } from '@/types/auth'
import type { ListColumnSettings } from '@/types/module-page'

export interface PersonalSettings {
  fontSize?: number
}

export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token)
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.token, token)
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.token)
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user)
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
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEYS.user)
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
