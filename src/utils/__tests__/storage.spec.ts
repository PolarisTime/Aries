import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearStoredUser,
  getListColumnSettings,
  getPersonalSettings,
  getStoredUser,
  setListColumnSettings,
  setPersonalSettings,
  setStoredUser,
} from '@/utils/storage'

const mockUser = { id: 1, loginName: 'admin', userName: 'Admin' }
const mockSettings = { fontSize: 14, layoutMode: 'sider' as const }
const mockColSettings = { orderedKeys: ['a', 'b'], hiddenKeys: ['c'] }

beforeEach(() => {
  localStorage.clear()
  clearStoredUser()
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
    localStorage.setItem('aries-user', JSON.stringify({ id: 1 }))
    expect(getStoredUser()).toBeNull()
  })

  it('returns null for non-object data', () => {
    localStorage.setItem('aries-user', '"just-a-string"')
    expect(getStoredUser()).toBeNull()
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
    localStorage.setItem('aries-personal-settings', '[]')
    expect(getPersonalSettings()).toBeNull()
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
      'aries-list-col-settings:test-page',
      JSON.stringify({ orderedKeys: 'not-array', hiddenKeys: [] }),
    )
    expect(getListColumnSettings(pageKey)).toBeNull()
  })
})
