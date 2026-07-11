import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
  getSettlementCompanyOptions: vi.fn(),
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

  it('keeps customer settlement context visible and hides secondary contact details by default', () => {
    const columnKeys = customersPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys = customersPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['contactPhone', 'city'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'customerCode',
        'customerName',
        'projectName',
        'contactName',
        'settlementMode',
        'defaultSettlementCompanyName',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has detailFields', () => {
    expect(customersPageConfig.detailFields).toBeDefined()
  })

  it('has formFields', () => {
    expect(customersPageConfig.formFields).toBeDefined()
  })

  it('has default settlement company field', () => {
    expect(
      customersPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('defaultSettlementCompanyName')
    expect(customersPageConfig.formFields?.map((field) => field.key)).toContain(
      'defaultSettlementCompanyId',
    )
    expect(customersPageConfig.saveFields?.scalar).toContain(
      'defaultSettlementCompanyName',
    )
  })

  it('buildOverview returns result', () => {
    const result = customersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has rowHighlightStatuses', () => {
    expect(customersPageConfig.rowHighlightStatuses).toContain('禁用')
  })
})
