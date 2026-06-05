import { describe, expect, it } from 'vitest'
import {
  pageContent,
  pageHasMore,
  pageLast,
  pageTotalElements,
  pageTotalPages,
} from './page-contract'

describe('pageContract', () => {
  describe('pageContent', () => {
    it('extracts content array from page', () => {
      expect(pageContent({ content: [1, 2, 3] })).toEqual([1, 2, 3])
    })

    it('falls back to records array', () => {
      expect(pageContent({ records: ['a', 'b'] })).toEqual(['a', 'b'])
    })

    it('content takes precedence over records', () => {
      expect(pageContent({ content: [1], records: [2] })).toEqual([1])
    })

    it('returns empty array for null/undefined input', () => {
      expect(pageContent(null)).toEqual([])
      expect(pageContent(undefined)).toEqual([])
    })

    it('returns empty array when both are missing', () => {
      expect(pageContent({})).toEqual([])
    })
  })

  describe('pageTotalElements', () => {
    it('returns totalElements value', () => {
      expect(pageTotalElements({ totalElements: 100 })).toBe(100)
    })

    it('returns 0 when null/undefined', () => {
      expect(pageTotalElements(null)).toBe(0)
      expect(pageTotalElements(undefined)).toBe(0)
    })

    it('returns 0 when missing', () => {
      expect(pageTotalElements({})).toBe(0)
    })
  })

  describe('pageTotalPages', () => {
    it('returns totalPages value', () => {
      expect(pageTotalPages({ totalPages: 5 })).toBe(5)
    })

    it('returns at least 1', () => {
      expect(pageTotalPages({ totalPages: 0 })).toBe(1)
      expect(pageTotalPages(null)).toBe(1)
      expect(pageTotalPages(undefined)).toBe(1)
    })

    it('defaults to 1 when missing', () => {
      expect(pageTotalPages({})).toBe(1)
    })
  })

  describe('pageLast', () => {
    it('uses last field when present', () => {
      expect(pageLast({ last: true })).toBe(true)
      expect(pageLast({ last: false })).toBe(false)
    })

    it('computes from currentPage vs totalPages (not last)', () => {
      const page = { currentPage: 2, totalPages: 5 }
      expect(pageLast(page)).toBe(false)
    })

    it('returns true on last page', () => {
      const page = { page: 4, totalPages: 5 }
      expect(pageLast(page)).toBe(true)
    })

    it('returns false on non-last page using page field', () => {
      const page = { page: 0, totalPages: 5 }
      expect(pageLast(page)).toBe(false)
    })
  })

  describe('pageHasMore', () => {
    it('uses hasMore field when present', () => {
      expect(pageHasMore({ hasMore: true })).toBe(true)
      expect(pageHasMore({ hasMore: false })).toBe(false)
    })

    it('derives from last field when hasMore absent', () => {
      expect(pageHasMore({ last: false })).toBe(true)
      expect(pageHasMore({ last: true })).toBe(false)
    })

    it('computes from currentPage vs totalPages when hasMore/last absent', () => {
      const page = { currentPage: 2, totalPages: 5 }
      expect(pageHasMore(page)).toBe(true)

      const lastPage = { page: 4, totalPages: 5 }
      expect(pageHasMore(lastPage)).toBe(false)
    })

    it('returns false when null/undefined', () => {
      expect(pageHasMore(null)).toBe(false)
      expect(pageHasMore(undefined)).toBe(false)
    })
  })
})
