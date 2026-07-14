import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
  getSettlementCompanyOptions: [],
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
}))

import { masterPartyPageConfigs } from './master-party-pages'

describe('masterPartyPageConfigs', () => {
  it('contains supplier config', () => {
    expect(masterPartyPageConfigs.supplier).toBeDefined()
    expect(masterPartyPageConfigs.supplier.key).toBe('supplier')
  })

  it('contains customer config', () => {
    expect(masterPartyPageConfigs.customer).toBeDefined()
    expect(masterPartyPageConfigs.customer.key).toBe('customer')
  })

  it('contains carrier config', () => {
    expect(masterPartyPageConfigs.carrier).toBeDefined()
    expect(masterPartyPageConfigs.carrier.key).toBe('carrier')
  })

  it('has exactly 3 entries', () => {
    expect(Object.keys(masterPartyPageConfigs)).toHaveLength(3)
  })
})
