import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { customersPageConfig } from './customer-page'

describe('customersPageConfig', () => {
  it('has correct key', () => {
    expect(customersPageConfig.key).toBe('customer')
  })

  it('has primaryNoKey', () => {
    expect(customersPageConfig.primaryNoKey).toBe('customerCode')
  })

  it('has filters', () => {
    expect(customersPageConfig.filters).toBeDefined()
    expect(customersPageConfig.filters!.length).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(customersPageConfig.columns).toBeDefined()
    expect(customersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(customersPageConfig.detailFields).toBeDefined()
  })

  it('has formFields', () => {
    expect(customersPageConfig.formFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = customersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has rowHighlightStatuses', () => {
    expect(customersPageConfig.rowHighlightStatuses).toContain('禁用')
  })
})
