import { describe, it, expect } from 'vitest'

describe('module-page types', () => {
  it('should import without error', async () => {
    const mod = await import('./module-page')
    expect(mod).toBeDefined()
  })
})