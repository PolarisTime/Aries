import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: [],
  getCustomerOptions: [],
  buildValueOptions: (...args: string[]) => args.map((v) => ({ label: v, value: v })),
  enabledStatusOptions: [],
}))

import { contractOperationsPageConfigs } from './contract-operations'

describe('contractOperationsPageConfigs', () => {
  it('contains purchase-contract config', () => {
    expect(contractOperationsPageConfigs['purchase-contract']).toBeDefined()
    expect(contractOperationsPageConfigs['purchase-contract'].key).toBe('purchase-contract')
  })

  it('contains sales-contract config', () => {
    expect(contractOperationsPageConfigs['sales-contract']).toBeDefined()
    expect(contractOperationsPageConfigs['sales-contract'].key).toBe('sales-contract')
  })

  it('has exactly 2 entries', () => {
    expect(Object.keys(contractOperationsPageConfigs)).toHaveLength(2)
  })
})
