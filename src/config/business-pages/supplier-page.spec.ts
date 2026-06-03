import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { suppliersPageConfig } from './supplier-page'

describe('suppliersPageConfig', () => {
  it('has correct key', () => {
    expect(suppliersPageConfig.key).toBe('supplier')
  })

  it('has primaryNoKey', () => {
    expect(suppliersPageConfig.primaryNoKey).toBe('supplierCode')
  })

  it('has filters', () => {
    expect(suppliersPageConfig.filters).toBeDefined()
    expect(suppliersPageConfig.filters!.length).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(suppliersPageConfig.columns).toBeDefined()
    expect(suppliersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(suppliersPageConfig.detailFields).toBeDefined()
  })

  it('has formFields', () => {
    expect(suppliersPageConfig.formFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = suppliersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has rowHighlightStatuses', () => {
    expect(suppliersPageConfig.rowHighlightStatuses).toContain('禁用')
  })
})
