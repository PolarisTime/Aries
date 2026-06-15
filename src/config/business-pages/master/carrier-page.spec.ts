import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { carriersPageConfig } from './carrier-page'

describe('carriersPageConfig', () => {
  it('has correct key', () => {
    expect(carriersPageConfig.key).toBe('carrier')
  })

  it('has primaryNoKey', () => {
    expect(carriersPageConfig.primaryNoKey).toBe('carrierCode')
  })

  it('has filters', () => {
    expect(carriersPageConfig.filters).toBeDefined()
    expect(carriersPageConfig.filters!.length).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(carriersPageConfig.columns).toBeDefined()
    expect(carriersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(carriersPageConfig.formFields).toBeDefined()
    expect(carriersPageConfig.formFields!.length).toBeGreaterThan(0)
  })

  it('buildOverview returns result', () => {
    const result = carriersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
