import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getCustomerOptions: [],
}))

import { salesContractsPageConfig } from './sales-contract-page'

describe('salesContractsPageConfig', () => {
  it('has correct key', () => {
    expect(salesContractsPageConfig.key).toBe('sales-contract')
  })

  it('has primaryNoKey', () => {
    expect(salesContractsPageConfig.primaryNoKey).toBe('contractNo')
  })

  it('has filters', () => {
    expect(salesContractsPageConfig.filters).toBeDefined()
    expect(salesContractsPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps core filters visible and moves the sign date to the advanced row', () => {
    const filterRows = Object.fromEntries(
      salesContractsPageConfig.filters.map((filter) => [
        filter.key,
        filter.row ?? 1,
      ]),
    )

    expect(filterRows).toEqual({
      keyword: 1,
      customerName: 1,
      status: 1,
      signDate: 2,
    })
  })

  it('has columns', () => {
    expect(salesContractsPageConfig.columns).toBeDefined()
    expect(salesContractsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('hides secondary dates and salesperson while keeping scan columns visible', () => {
    expect(salesContractsPageConfig.defaultHiddenColumnKeys).toEqual([
      'effectiveDate',
      'expireDate',
      'salesName',
    ])
    for (const key of [
      'contractNo',
      'customerName',
      'projectName',
      'signDate',
      'totalWeight',
      'totalAmount',
      'status',
    ]) {
      expect(salesContractsPageConfig.defaultHiddenColumnKeys).not.toContain(
        key,
      )
    }
  })

  it('has formFields', () => {
    expect(salesContractsPageConfig.formFields).toBeDefined()
  })

  it('has itemColumns', () => {
    expect(salesContractsPageConfig.itemColumns).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = salesContractsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
