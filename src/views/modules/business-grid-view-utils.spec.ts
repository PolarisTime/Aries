import { describe, expect, it } from 'vitest'

import { resolveBusinessGridInitialConfig } from '@/views/modules/business-grid-view-utils'

describe('resolveBusinessGridInitialConfig', () => {
  it('returns undefined when pageDef is undefined', () => {
    expect(resolveBusinessGridInitialConfig(undefined)).toBeUndefined()
  })

  it('returns undefined when pageDef has no moduleKey', () => {
    const pageDef = { key: 'test' } as any
    expect(resolveBusinessGridInitialConfig(pageDef)).toBeUndefined()
  })

  it('returns undefined when loaderConfig key does not match moduleKey', () => {
    const pageDef = { moduleKey: 'module-a' } as any
    const loaderConfig = { key: 'module-b' } as any
    expect(resolveBusinessGridInitialConfig(pageDef, loaderConfig)).toBeUndefined()
  })

  it('returns loaderConfig when keys match', () => {
    const pageDef = { moduleKey: 'module-a' } as any
    const loaderConfig = { key: 'module-a', title: 'Test' } as any
    const result = resolveBusinessGridInitialConfig(pageDef, loaderConfig)
    expect(result).toBe(loaderConfig)
  })

  it('returns undefined when loaderConfig is undefined', () => {
    const pageDef = { moduleKey: 'module-a' } as any
    expect(resolveBusinessGridInitialConfig(pageDef, undefined)).toBeUndefined()
  })
})
