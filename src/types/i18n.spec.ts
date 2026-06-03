import { describe, it, expect } from 'vitest'

describe('i18n types', () => {
  it('should import without error', async () => {
    const mod = await import('./i18n')
    expect(mod).toBeDefined()
  })
})