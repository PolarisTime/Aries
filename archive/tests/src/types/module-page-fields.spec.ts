import { describe, expect, it } from 'vitest'

describe('module-page-fields types', () => {
  it('should import without error', async () => {
    const mod = await import('./module-page-fields')
    expect(mod).toBeDefined()
  })
})
