import { describe, it, expect } from 'vitest'

describe('user-account types', () => {
  it('should import without error', async () => {
    const mod = await import('./user-account')
    expect(mod).toBeDefined()
  })
})