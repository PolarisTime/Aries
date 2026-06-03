import { describe, it, expect } from 'vitest'

describe('setup types', () => {
  it('should import without error', async () => {
    const mod = await import('./setup')
    expect(mod).toBeDefined()
  })
})