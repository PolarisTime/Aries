import { describe, expect, it } from 'vitest'
import { ERROR_CODE } from './error-codes'

describe('ERROR_CODE', () => {
  it('has correct SUCCESS code', () => {
    expect(ERROR_CODE.SUCCESS).toBe(0)
  })

  it('has correct VALIDATION_ERROR code', () => {
    expect(ERROR_CODE.VALIDATION_ERROR).toBe(4000)
  })

  it('has correct UNAUTHORIZED code', () => {
    expect(ERROR_CODE.UNAUTHORIZED).toBe(4010)
  })

  it('has correct SESSION_EVICTED code', () => {
    expect(ERROR_CODE.SESSION_EVICTED).toBe(4011)
  })

  it('has correct REFRESH_TOKEN_REUSE_CONFLICT code', () => {
    expect(ERROR_CODE.REFRESH_TOKEN_REUSE_CONFLICT).toBe(4091)
  })

  it('has correct FORBIDDEN code', () => {
    expect(ERROR_CODE.FORBIDDEN).toBe(4030)
  })

  it('has correct NOT_FOUND code', () => {
    expect(ERROR_CODE.NOT_FOUND).toBe(4040)
  })

  it('has correct BUSINESS_ERROR code', () => {
    expect(ERROR_CODE.BUSINESS_ERROR).toBe(4220)
  })

  it('has correct INTERNAL_ERROR code', () => {
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(5000)
  })

  it('has all expected keys', () => {
    const expectedKeys = [
      'SUCCESS',
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'SESSION_EVICTED',
      'REFRESH_TOKEN_REUSE_CONFLICT',
      'FORBIDDEN',
      'NOT_FOUND',
      'BUSINESS_ERROR',
      'INTERNAL_ERROR',
    ]

    for (const key of expectedKeys) {
      expect(ERROR_CODE).toHaveProperty(key)
    }
  })

  it('all values are numbers', () => {
    for (const value of Object.values(ERROR_CODE)) {
      expect(typeof value).toBe('number')
    }
  })
})
