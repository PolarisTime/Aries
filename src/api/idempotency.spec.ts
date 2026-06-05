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
})
