import { describe, expect, it } from 'vitest'
import { HTTP_STATUS } from './http-status'

describe('HTTP_STATUS', () => {
  it('has correct OK status', () => {
    expect(HTTP_STATUS.OK).toBe(200)
  })

  it('has correct CREATED status', () => {
    expect(HTTP_STATUS.CREATED).toBe(201)
  })

  it('has correct NO_CONTENT status', () => {
    expect(HTTP_STATUS.NO_CONTENT).toBe(204)
  })

  it('has correct BAD_REQUEST status', () => {
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400)
  })

  it('has correct UNAUTHORIZED status', () => {
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401)
  })

  it('has correct FORBIDDEN status', () => {
    expect(HTTP_STATUS.FORBIDDEN).toBe(403)
  })

  it('has correct NOT_FOUND status', () => {
    expect(HTTP_STATUS.NOT_FOUND).toBe(404)
  })

  it('has correct CONFLICT status', () => {
    expect(HTTP_STATUS.CONFLICT).toBe(409)
  })

  it('has correct UNPROCESSABLE_ENTITY status', () => {
    expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422)
  })

  it('has correct INTERNAL_SERVER_ERROR status', () => {
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
  })

  it('has all expected keys', () => {
    const expectedKeys = [
      'OK',
      'CREATED',
      'NO_CONTENT',
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'UNPROCESSABLE_ENTITY',
      'INTERNAL_SERVER_ERROR',
    ]

    for (const key of expectedKeys) {
      expect(HTTP_STATUS).toHaveProperty(key)
    }
  })

  it('all values are numbers', () => {
    for (const value of Object.values(HTTP_STATUS)) {
      expect(typeof value).toBe('number')
    }
  })
})
