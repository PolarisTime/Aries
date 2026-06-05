import { describe, expect, it } from 'vitest'
import type { RetryableRequestConfig } from './types'

describe('RetryableRequestConfig', () => {
  it('extends InternalAxiosRequestConfig with optional _retry', () => {
    const config = {
      headers: new Headers(),
      url: '/test',
      method: 'get' as const,
      _retry: true,
    } satisfies Partial<RetryableRequestConfig> & { _retry: boolean }
    expect(config._retry).toBe(true)
  })

  it('allows _retry to be undefined', () => {
    const config: RetryableRequestConfig = {
      headers: new Headers(),
      url: '/test',
      method: 'get',
    } as unknown as RetryableRequestConfig
    expect(config._retry).toBeUndefined()
  })

  it('allows _retry to be false', () => {
    const config = {
      headers: new Headers(),
      url: '/test',
      method: 'post' as const,
      _retry: false,
    } satisfies Partial<RetryableRequestConfig> & { _retry: boolean }
    expect(config._retry).toBe(false)
  })
})
