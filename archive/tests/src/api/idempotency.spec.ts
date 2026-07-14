import { AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createIdempotencyKey,
  IDEMPOTENCY_HEADER,
  withIdempotencyKey,
} from './idempotency'

describe('idempotency', () => {
  const originalCrypto = globalThis.crypto

  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: vi.fn(() => 'uuid-1'),
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  it('creates key with crypto randomUUID when available', () => {
    expect(createIdempotencyKey()).toBe('uuid-1')
  })

  it('creates fallback key when crypto randomUUID is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    })
    const now = 1_700_000_000_000
    const randomValue = 0.5
    vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.spyOn(Math, 'random').mockReturnValue(randomValue)

    expect(createIdempotencyKey()).toBe(
      `idem-${now.toString(36)}-${randomValue.toString(36).slice(2)}`,
    )
  })

  it('adds idempotency header when config is omitted', () => {
    const config = withIdempotencyKey()

    expect(config).toEqual({
      headers: {
        [IDEMPOTENCY_HEADER]: 'uuid-1',
      },
    })
  })

  it('adds idempotency header without losing existing headers', () => {
    const config = withIdempotencyKey({
      headers: {
        'X-Business-Module-Key': 'purchase-order',
      },
    })

    expect(config.headers).toEqual({
      'X-Business-Module-Key': 'purchase-order',
      [IDEMPOTENCY_HEADER]: 'uuid-1',
    })
  })

  it('keeps existing idempotency header', () => {
    const config = withIdempotencyKey({
      headers: {
        [IDEMPOTENCY_HEADER]: 'existing-key',
      },
    })

    expect(config.headers).toEqual({
      [IDEMPOTENCY_HEADER]: 'existing-key',
    })
  })

  it('clones AxiosHeaders before adding idempotency header', () => {
    const headers = new AxiosHeaders({
      'X-Business-Module-Key': 'purchase-order',
    })

    const config = withIdempotencyKey({ headers })

    expect(config.headers).toEqual({
      'X-Business-Module-Key': 'purchase-order',
      [IDEMPOTENCY_HEADER]: 'uuid-1',
    })
    expect(headers.has(IDEMPOTENCY_HEADER)).toBe(false)
  })
})
