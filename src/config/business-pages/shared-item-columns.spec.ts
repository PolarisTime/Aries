import { describe, expect, it } from 'vitest'

describe('shared-item-columns barrel', () => {
  it('re-exports from shared-item-column-base', async () => {
    const mod = await import('./shared-item-columns')
    expect(mod).toHaveProperty('orderItemColumns')
    expect(mod).toHaveProperty('purchaseItemColumns')
    expect(mod).toHaveProperty('purchaseInboundItemColumns')
  })

  it('re-exports from shared-item-column-compact', async () => {
    const mod = await import('./shared-item-columns')
    expect(mod).toHaveProperty('compactOrderItemColumns')
    expect(mod).toHaveProperty('compactPurchaseItemColumns')
  })

  it('re-exports from shared-item-column-freight', async () => {
    const mod = await import('./shared-item-columns')
    expect(mod).toHaveProperty('freightItemColumns')
    expect(mod).toHaveProperty('compactFreightItemColumns')
  })

  it('re-exports from shared-item-column-utils', async () => {
    const mod = await import('./shared-item-columns')
    expect(mod.insertColumnsAfter).toBeInstanceOf(Function)
    expect(mod.applyCompactItemLayout).toBeInstanceOf(Function)
  })
})
