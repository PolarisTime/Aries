import { describe, expect, it } from 'vitest'
import { isApiKeyToken } from '../auth-token'

describe('isApiKeyToken', () => {
  it('returns true for valid API key', () => {
    expect(isApiKeyToken('leo_abc123DEF')).toBe(true)
  })

  it('returns true for API key with hyphens', () => {
    expect(isApiKeyToken('leo_abc-123-DEF')).toBe(true)
  })

  it('returns true for API key with underscores', () => {
    expect(isApiKeyToken('leo_abc_123_DEF')).toBe(true)
  })

  it('trims whitespace before checking', () => {
    expect(isApiKeyToken('  leo_abc123  ')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isApiKeyToken(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isApiKeyToken(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isApiKeyToken('')).toBe(false)
  })

  it('returns false for non-leo prefix', () => {
    expect(isApiKeyToken('tok_abc123')).toBe(false)
  })

  it('returns false for plain token', () => {
    expect(isApiKeyToken('abc123')).toBe(false)
  })

  it('returns false for key without underscore after prefix', () => {
    expect(isApiKeyToken('leo')).toBe(false)
  })
})
