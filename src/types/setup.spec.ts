import { describe, expect, it } from 'vitest'

describe('setup types', () => {
  it('should import without error', async () => {
    const mod = await import('./setup')
    expect(mod).toBeDefined()
  })
})
