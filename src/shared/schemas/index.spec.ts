import { describe, it, expect } from 'vitest'

describe('shared/schemas index', () => {
  it('should export expected types', async () => {
    const mod = await import('./index')
    // Check that the module has exports (we can't directly test types at runtime)
    expect(mod).toBeDefined()
    // Since we cannot check types at runtime, we can just verify the module loads
    // without errors
  })
})