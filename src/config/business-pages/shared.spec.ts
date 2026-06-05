import { describe, expect, it } from 'vitest'

describe('shared barrel', () => {
  it('re-exports from shared-item-columns', async () => {
    const mod = await import('./shared')
    expect(mod).toHaveProperty('orderItemColumns')
    expect(mod).toHaveProperty('insertColumnsAfter')
  })

  it('re-exports from shared-line-items', async () => {
    const mod = await import('./shared')
    expect(mod).toHaveProperty('cloneLineItems')
    expect(mod).toHaveProperty('transformFreightItems')
  })

  it('re-exports from shared-overview', async () => {
    const mod = await import('./shared')
    expect(mod).toHaveProperty('formatAmount')
    expect(mod).toHaveProperty('formatWeight')
    expect(mod).toHaveProperty('sumBy')
  })

  it('re-exports from shared-status', async () => {
    const mod = await import('./shared')
    expect(mod).toHaveProperty('statusMap')
  })
})
