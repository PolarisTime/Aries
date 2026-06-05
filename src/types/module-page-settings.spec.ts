import { describe, expect, it } from 'vitest'

describe('module-page-settings types', () => {
  it('should import without error', async () => {
    const mod = await import('./module-page-settings')
    expect(mod).toBeDefined()
  })
})
