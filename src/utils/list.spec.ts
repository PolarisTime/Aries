import { describe, expect, it } from 'vitest'

describe('list', () => {
  it('can be imported without errors', async () => {
    const module = await import('./list')
    expect(module).toBeDefined()
    expect(typeof module).toBe('object')
  })
})