import { describe, expect, it } from 'vitest'

describe('print-template types', () => {
  it('should import without error', async () => {
    const mod = await import('./print-template')
    expect(mod).toBeDefined()
  })
})
