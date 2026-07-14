import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from './storage'

describe('STORAGE_KEYS', () => {
  it('has correct token key', () => {
    expect(STORAGE_KEYS.token).toBe('aries-token')
  })

  it('has correct refreshToken key', () => {
    expect(STORAGE_KEYS.refreshToken).toBe('aries-refresh-token')
  })

  it('has correct tokenExpiresAt key', () => {
    expect(STORAGE_KEYS.tokenExpiresAt).toBe('aries-token-expires-at')
  })

  it('has correct user key', () => {
    expect(STORAGE_KEYS.user).toBe('aries-user')
  })

  it('has correct authPersistence key', () => {
    expect(STORAGE_KEYS.authPersistence).toBe('aries-auth-persistence')
  })

  it('has correct personalSettings key', () => {
    expect(STORAGE_KEYS.personalSettings).toBe('aries-personal-settings')
  })

  it('has correct listColumnSettingsPrefix key', () => {
    expect(STORAGE_KEYS.listColumnSettingsPrefix).toBe(
      'aries-list-column-settings:',
    )
  })

  it('has correct businessListCachePrefix key', () => {
    expect(STORAGE_KEYS.businessListCachePrefix).toBe(
      'aries-business-list-cache:',
    )
  })

  it('has all expected keys', () => {
    const expectedKeys = [
      'token',
      'refreshToken',
      'tokenExpiresAt',
      'user',
      'authPersistence',
      'personalSettings',
      'listColumnSettingsPrefix',
      'businessListCachePrefix',
    ]

    for (const key of expectedKeys) {
      expect(STORAGE_KEYS).toHaveProperty(key)
    }
  })

  it('all values are strings', () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(typeof value).toBe('string')
    }
  })
})
