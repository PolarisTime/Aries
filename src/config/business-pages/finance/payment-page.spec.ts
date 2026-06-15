import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { paymentsPageConfig } from './payment-page'

describe('paymentsPageConfig', () => {
  it('has correct key', () => {
    expect(paymentsPageConfig.key).toBe('payment')
  })

  it('has primaryNoKey', () => {
    expect(paymentsPageConfig.primaryNoKey).toBe('paymentNo')
  })

  it('has filters', () => {
    expect(paymentsPageConfig.filters).toBeDefined()
    expect(paymentsPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(paymentsPageConfig.columns).toBeDefined()
    expect(paymentsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(paymentsPageConfig.formFields).toBeDefined()
  })

  it('has saveFields', () => {
    expect(paymentsPageConfig.saveFields).toBeDefined()
    expect(paymentsPageConfig.saveFields!.scalar).toContain('paymentNo')
  })

  it('buildOverview returns result', () => {
    const result = paymentsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
