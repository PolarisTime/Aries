import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { ioReportPageConfig } from './io-report-page'

describe('ioReportPageConfig', () => {
  it('has correct key', () => {
    expect(ioReportPageConfig.key).toBe('io-report')
  })

  it('is readOnly', () => {
    expect(ioReportPageConfig.readOnly).toBe(true)
  })

  it('has filters', () => {
    expect(ioReportPageConfig.filters).toBeDefined()
    expect(ioReportPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(ioReportPageConfig.columns).toBeDefined()
    expect(ioReportPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('keeps movement context visible and hides secondary item details by default', () => {
    const columnKeys = ioReportPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys = ioReportPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['spec', 'batchNo', 'quantityUnit'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'businessDate',
        'businessType',
        'sourceNo',
        'materialCode',
        'warehouseName',
        'inQuantity',
        'outQuantity',
        'inWeightTon',
        'outWeightTon',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has detailFields', () => {
    expect(ioReportPageConfig.detailFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = ioReportPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })
})
