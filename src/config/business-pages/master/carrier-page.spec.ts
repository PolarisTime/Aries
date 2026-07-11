import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
  getSettlementCompanyOptions: vi.fn(),
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

  it('keeps carrier settlement context visible and hides secondary details by default', () => {
    const columnKeys = carriersPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys = carriersPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['contactPhone', 'vehicleType', 'remark'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'carrierCode',
        'carrierName',
        'contactName',
        'priceMode',
        'defaultSettlementCompanyName',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has formFields', () => {
    expect(carriersPageConfig.formFields).toBeDefined()
    expect(carriersPageConfig.formFields!.length).toBeGreaterThan(0)
  })

  it('has default settlement company field', () => {
    expect(
      carriersPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('defaultSettlementCompanyName')
    expect(carriersPageConfig.formFields?.map((field) => field.key)).toContain(
      'defaultSettlementCompanyId',
    )
    expect(carriersPageConfig.saveFields?.scalar).toContain(
      'defaultSettlementCompanyName',
    )
  })

  it('buildOverview returns result', () => {
    const result = carriersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
