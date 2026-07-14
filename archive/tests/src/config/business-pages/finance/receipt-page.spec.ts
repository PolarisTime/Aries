import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getCustomerOptions: () => [],
  getCustomerProjectOptions: () => [],
  getSettlementCompanyOptions: () => [],
}))

import { receiptsPageConfig } from './receipt-page'

describe('receiptsPageConfig', () => {
  it('has correct key', () => {
    expect(receiptsPageConfig.key).toBe('receipt')
  })

  it('has primaryNoKey', () => {
    expect(receiptsPageConfig.primaryNoKey).toBe('receiptNo')
  })

  it('has filters', () => {
    expect(receiptsPageConfig.filters).toBeDefined()
    expect(receiptsPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(receiptsPageConfig.columns).toBeDefined()
    expect(receiptsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(receiptsPageConfig.formFields).toBeDefined()
  })

  it('has saveFields', () => {
    expect(receiptsPageConfig.saveFields).toBeDefined()
    expect(receiptsPageConfig.saveFields!.scalar).toContain('receiptNo')
    expect(receiptsPageConfig.saveFields!.scalar).toContain(
      'settlementCompanyId',
    )
  })

  it('uses stable customer, project and customer-statement identities', () => {
    const fieldKeys = receiptsPageConfig.formFields?.map((field) => field.key)

    expect(fieldKeys).toEqual(
      expect.arrayContaining([
        'customerId',
        'customerName',
        'projectId',
        'projectName',
        'sourceCustomerStatementId',
      ]),
    )
    expect(fieldKeys).not.toContain('sourceStatementId')
    expect(receiptsPageConfig.saveFields?.scalar).toEqual(
      expect.arrayContaining([
        'customerId',
        'projectId',
        'sourceCustomerStatementId',
      ]),
    )
    expect(receiptsPageConfig.saveFields?.scalar).not.toContain(
      'sourceStatementId',
    )
  })

  it('allows an unallocated draft while the backend enforces settled allocations', () => {
    const sourceField = receiptsPageConfig.formFields?.find(
      (field) => field.key === 'sourceCustomerStatementId',
    )

    expect(sourceField?.required).toBe(false)
  })

  it('buildOverview returns result', () => {
    const result = receiptsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has defaultHiddenColumnKeys', () => {
    expect(receiptsPageConfig.defaultHiddenColumnKeys).toBeDefined()
  })
})
