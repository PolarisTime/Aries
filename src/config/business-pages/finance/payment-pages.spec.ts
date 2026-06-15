import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  customerOptions: [],
  enabledStatusOptions: [],
}))

import { paymentPageConfigs } from './payment-pages'

describe('paymentPageConfigs', () => {
  it('contains receipt config', () => {
    expect(paymentPageConfigs.receipt).toBeDefined()
    expect(paymentPageConfigs.receipt.key).toBe('receipt')
  })

  it('contains payment config', () => {
    expect(paymentPageConfigs.payment).toBeDefined()
    expect(paymentPageConfigs.payment.key).toBe('payment')
  })

  it('contains ledger adjustment config', () => {
    expect(paymentPageConfigs['ledger-adjustment']).toBeDefined()
    expect(paymentPageConfigs['ledger-adjustment'].key).toBe(
      'ledger-adjustment',
    )
  })

  it('has exactly 3 entries', () => {
    expect(Object.keys(paymentPageConfigs)).toHaveLength(3)
  })
})
