import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getCustomerOptions: [],
  getCustomerProjectOptions: [],
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  enabledStatusOptions: [],
}))

import { salesOperationsPageConfigs } from './sales-operations'

describe('salesOperationsPageConfigs', () => {
  it('contains sales-order config', () => {
    expect(salesOperationsPageConfigs['sales-order']).toBeDefined()
    expect(salesOperationsPageConfigs['sales-order'].key).toBe('sales-order')
  })

  it('contains sales-outbound config', () => {
    expect(salesOperationsPageConfigs['sales-outbound']).toBeDefined()
    expect(salesOperationsPageConfigs['sales-outbound'].key).toBe(
      'sales-outbound',
    )
  })

  it('has exactly 2 entries', () => {
    expect(Object.keys(salesOperationsPageConfigs)).toHaveLength(2)
  })
})
