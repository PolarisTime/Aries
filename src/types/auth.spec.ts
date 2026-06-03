import { describe, it, expect } from 'vitest'

describe('auth types', () => {
  it('should import without error', async () => {
    const mod = await import('./auth')
    expect(mod).toBeDefined()
  })
})