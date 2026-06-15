import { describe, expect, it } from 'vitest'
import { statementPageConfigs } from './statement-pages'

describe('statementPageConfigs', () => {
  it('contains all three statement configs', () => {
    expect(Object.keys(statementPageConfigs)).toEqual([
      'supplier-statement',
      'customer-statement',
      'freight-statement',
    ])
  })

  it('each config has required fields', () => {
    for (const [, config] of Object.entries(statementPageConfigs)) {
      expect(config.key).toBeTruthy()
      expect(config.title).toBeTruthy()
      expect(config.primaryNoKey).toBeTruthy()
      expect(Array.isArray(config.actions)).toBe(true)
      expect(Array.isArray(config.filters)).toBe(true)
      expect(Array.isArray(config.columns)).toBe(true)
      expect(config.buildOverview).toBeTypeOf('function')
    }
  })
})
