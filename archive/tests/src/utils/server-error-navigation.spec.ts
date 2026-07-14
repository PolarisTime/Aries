import { describe, expect, it } from 'vitest'
import {
  getServerErrorReturnPath,
  isSafeServerErrorRetryPath,
  resolveServerErrorRetryPath,
} from './server-error-navigation'

describe('server-error-navigation', () => {
  it('builds return path with search and hash', () => {
    expect(
      getServerErrorReturnPath({
        pathname: '/access-control',
        searchStr: 'tab=roles',
        hash: 'section',
      }),
    ).toBe('/access-control?tab=roles#section')
  })

  it('keeps existing search and hash prefixes when building return path', () => {
    expect(
      getServerErrorReturnPath({
        pathname: '/access-control',
        searchStr: '?tab=roles',
        hash: '#section',
      }),
    ).toBe('/access-control?tab=roles#section')
  })

  it('omits non-string location parts when building return path', () => {
    expect(
      getServerErrorReturnPath({
        pathname: '/access-control',
        searchStr: 1,
        hash: 2,
      }),
    ).toBe('/access-control')
  })

  it('rejects locations without a string pathname', () => {
    expect(getServerErrorReturnPath({ pathname: 1 })).toBeUndefined()
  })

  it('rejects server error route as return path', () => {
    expect(
      getServerErrorReturnPath({
        pathname: '/server-error',
        searchStr: 'from=/dashboard',
      }),
    ).toBeUndefined()
  })

  it('resolves retry path from query string', () => {
    expect(
      resolveServerErrorRetryPath('?from=%2Faccess-control%3Ftab%3Droles'),
    ).toBe('/access-control?tab=roles')
  })

  it('falls back when retry path is missing or unsafe', () => {
    expect(resolveServerErrorRetryPath('')).toBe('/')
    expect(resolveServerErrorRetryPath('?from=https%3A%2F%2Fexample.com')).toBe(
      '/',
    )
    expect(resolveServerErrorRetryPath('?from=%2Fserver-error')).toBe('/')
  })

  it('accepts only internal non-error paths', () => {
    expect(isSafeServerErrorRetryPath('/dashboard')).toBe(true)
    expect(isSafeServerErrorRetryPath('/dashboard#summary')).toBe(true)
    expect(isSafeServerErrorRetryPath('//example.com')).toBe(false)
    expect(isSafeServerErrorRetryPath('dashboard')).toBe(false)
    expect(isSafeServerErrorRetryPath(undefined)).toBe(false)
  })
})
