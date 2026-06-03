import { describe, expect, it } from 'vitest'

describe('api-raw types', () => {
  it('should import without error', async () => {
    const mod = await import('./api-raw')
    expect(mod).toBeDefined()
  })

  it('should have module exports', async () => {
    const mod = await import('./api-raw')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
