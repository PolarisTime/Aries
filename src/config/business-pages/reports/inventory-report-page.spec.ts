import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getWarehouseOptions: [],
  materialCategoryOptions: [],
}))

import { inventoryReportPageConfig } from './inventory-report-page'

describe('inventoryReportPageConfig', () => {
  it('has correct key', () => {
    expect(inventoryReportPageConfig.key).toBe('inventory-report')
  })

  it('is readOnly', () => {
    expect(inventoryReportPageConfig.readOnly).toBe(true)
  })

  it('has filters', () => {
    expect(inventoryReportPageConfig.filters).toBeDefined()
    expect(inventoryReportPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(inventoryReportPageConfig.columns).toBeDefined()
    expect(inventoryReportPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(inventoryReportPageConfig.detailFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = inventoryReportPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })
})
