import { describe, expect, it } from 'vitest'
import {
  isCanceledRequestError,
  markHandledRequestError,
} from './request-errors'

describe('request-errors', () => {
  describe('markHandledRequestError', () => {
    it('adds flag to error object', () => {
      const err = new Error('test')
      markHandledRequestError(err)
      expect((err as Record<string, unknown>).__leoRequestErrorHandled).toBe(
        true,
      )
    })

    it('does nothing for null/undefined', () => {
      expect(() => markHandledRequestError(null)).not.toThrow()
      expect(() => markHandledRequestError(undefined)).not.toThrow()
    })

    it('does nothing for primitives', () => {
      expect(() => markHandledRequestError('string')).not.toThrow()
      expect(() => markHandledRequestError(42)).not.toThrow()
    })
  })

  describe('isCanceledRequestError', () => {
    it('returns true for axios Cancel', () => {
      const error = { __CANCEL__: true } as never
      expect(isCanceledRequestError(error)).toBe(true)
    })

    it('returns false for null/undefined', () => {
      expect(isCanceledRequestError(null)).toBe(false)
      expect(isCanceledRequestError(undefined)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isCanceledRequestError('string')).toBe(false)
    })

    it('returns true for ERR_CANCELED code', () => {
      expect(isCanceledRequestError({ code: 'ERR_CANCELED' })).toBe(true)
    })

    it('returns true for AbortError name', () => {
      expect(isCanceledRequestError({ name: 'AbortError' })).toBe(true)
    })

    it('returns true for CanceledError name', () => {
      expect(isCanceledRequestError({ name: 'CanceledError' })).toBe(true)
    })

    it('returns true for canceled message (lowercase)', () => {
      expect(isCanceledRequestError({ message: 'canceled' })).toBe(true)
    })

    it('returns true for cancelled message', () => {
      expect(isCanceledRequestError({ message: 'cancelled' })).toBe(true)
    })

    it('returns true for "the operation was aborted" message', () => {
      expect(
        isCanceledRequestError({ message: 'the operation was aborted' }),
      ).toBe(true)
    })

    it('returns true for "signal is aborted without reason" message', () => {
      expect(
        isCanceledRequestError({
          message: 'signal is aborted without reason',
        }),
      ).toBe(true)
    })

    it('returns false for other errors', () => {
      expect(isCanceledRequestError({ code: 'ERR_BAD_REQUEST' })).toBe(false)
      expect(
        isCanceledRequestError({ name: 'TypeError', message: 'fail' }),
      ).toBe(false)
    })
  })
})
