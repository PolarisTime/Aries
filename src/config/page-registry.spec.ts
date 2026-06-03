import { describe, expect, it } from 'vitest'
import {
  getPageDefinition,
  getPageRoutePath,
  getSearchableModuleKeys,
} from './page-registry'

describe('page-registry', () => {
  it('getPageRoutePath returns route for known page', () => {
    expect(getPageRoutePath('purchase-order')).toBe('purchase-order')
  })

  it('getPageRoutePath returns route for known menuKey', () => {
    expect(getPageRoutePath('/purchase-order')).toBe('purchase-order')
  })

  it('getPageRoutePath throws for unknown key', () => {
    expect(() => getPageRoutePath('nonexistent')).toThrow('未找到页面定义')
  })

  it('getPageRoutePath handles AppPageDefinition input', () => {
    const def = getPageDefinition('purchase-order')!
    const route = getPageRoutePath(def)
    expect(route).toBe('purchase-order')
  })

  it('getPageDefinition returns page definition for known key', () => {
    const def = getPageDefinition('purchase-order')
    expect(def).toBeDefined()
    expect(def!.key).toBe('purchase-order')
  })

  it('getPageDefinition returns undefined for unknown key', () => {
    expect(getPageDefinition('unknown-key')).toBeUndefined()
  })

  it('getSearchableModuleKeys returns module keys', () => {
    const keys = getSearchableModuleKeys()
    expect(Array.isArray(keys)).toBe(true)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).toContain('purchase-order')
  })
})
