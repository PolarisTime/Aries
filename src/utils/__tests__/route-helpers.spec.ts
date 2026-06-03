import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCurrentAppRoute, getRequestPath, isExactAuthEndpoint } from '../route-helpers'

describe('route-helpers', () => {
  describe('getCurrentAppRoute', () => {
    const originalLocation = window.location

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      })
    })

    it('returns full path including search and hash', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/orders',
          search: '?status=active',
          hash: '#section',
        },
        writable: true,
      })
      expect(getCurrentAppRoute()).toBe('/orders?status=active#section')
    })

    it('returns /dashboard for empty pathname', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '',
          search: '',
          hash: '',
        },
        writable: true,
      })
      expect(getCurrentAppRoute()).toBe('/dashboard')
    })

    it('returns pathname only when no search or hash', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/settings',
          search: '',
          hash: '',
        },
        writable: true,
      })
      expect(getCurrentAppRoute()).toBe('/settings')
    })

    it('returns path with hash only', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/page',
          search: '',
          hash: '#top',
        },
        writable: true,
      })
      expect(getCurrentAppRoute()).toBe('/page#top')
    })
  })

  describe('getRequestPath', () => {
    it('returns pathname from full URL', () => {
      const result = getRequestPath('https://example.com/api/users/123')
      expect(result).toBe('/api/users/123')
    })

    it('returns empty string for empty URL', () => {
      expect(getRequestPath('')).toBe('')
    })

    it('handles invalid URL by stripping hash and query', () => {
      const result = getRequestPath('/api/users?id=1#section')
      expect(result).toBe('/api/users')
    })

    it('handles URL with trailing slash', () => {
      const result = getRequestPath('http://localhost:3000/api/auth/login')
      expect(result).toBe('/api/auth/login')
    })

    it('handles malformed URL gracefully', () => {
      const result = getRequestPath('http://')
      expect(result).toBe('http://')
    })
  })

  describe('isExactAuthEndpoint', () => {
    it('returns true when path matches endpoint', () => {
      const result = isExactAuthEndpoint(
        'https://example.com/api/auth/login',
        '/api/auth/login',
      )
      expect(result).toBe(true)
    })

    it('returns false when path does not match endpoint', () => {
      const result = isExactAuthEndpoint(
        'https://example.com/api/auth/logout',
        '/api/auth/login',
      )
      expect(result).toBe(false)
    })

    it('returns false for empty URL', () => {
      expect(isExactAuthEndpoint('', '/api/auth/login')).toBe(false)
    })

    it('returns true for matching path with query params', () => {
      const result = isExactAuthEndpoint(
        'https://example.com/api/auth/login?redirect=/home',
        '/api/auth/login',
      )
      expect(result).toBe(true)
    })

    it('returns false for partial path match', () => {
      const result = isExactAuthEndpoint(
        'https://example.com/api/auth/login/extra',
        '/api/auth/login',
      )
      expect(result).toBe(false)
    })
  })
})
