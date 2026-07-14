import { describe, expect, it } from 'vitest'

describe('api types', () => {
  it('should import without error', async () => {
    const mod = await import('./api')
    expect(mod).toBeDefined()
  })
})
