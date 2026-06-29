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
    expect(inventoryReportPageConfig.filters!.length).toBeGreaterThanOrEqual(4)
  })

  it('adds stock scope filter for shipped-out history', () => {
    const stockScopeFilter = inventoryReportPageConfig.filters!.find(
      (filter) => filter.key === 'includeOutbound',
    )

    expect(stockScopeFilter).toMatchObject({
      label: 'modules.pages.inventoryReport.stockScope',
      type: 'select',
      row: 2,
    })
    expect(stockScopeFilter?.options).toEqual([
      {
        label: 'modules.pages.inventoryReport.currentStockOnly',
        value: 'false',
      },
      {
        label: 'modules.pages.inventoryReport.includeOutbound',
        value: 'true',
      },
    ])
  })

  it('has columns', () => {
    expect(inventoryReportPageConfig.columns).toBeDefined()
    expect(inventoryReportPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('keeps detail header fields empty because flow table carries row information', () => {
    expect(inventoryReportPageConfig.detailFields).toEqual([])
  })

  it('shows flow action for batch and warehouse detail rows', () => {
    expect(inventoryReportPageConfig.detailActionLabel).toBe(
      'modules.pages.inventoryReport.flow',
    )
    expect(inventoryReportPageConfig.detailItemTitle).toBe(
      'modules.pages.inventoryReport.flowDetail',
    )
  })

  it('keeps warehouse and batch out of merged inventory list columns', () => {
    const listKeys = inventoryReportPageConfig.columns.map(
      (column) => column.dataIndex,
    )

    expect(listKeys).not.toContain('warehouseName')
    expect(listKeys).not.toContain('batchNo')
  })

  it('shows material, warehouse, batch and outbound references in flow detail columns', () => {
    const detailItemKeys = inventoryReportPageConfig.detailItemColumns?.map(
      (column) => column.dataIndex,
    )

    expect(detailItemKeys).toEqual(
      expect.arrayContaining([
        'materialCode',
        'brand',
        'material',
        'category',
        'spec',
        'length',
        'warehouseName',
        'batchNo',
        'outboundNo',
        'outboundDate',
      ]),
    )
  })

  it('buildOverview returns result', () => {
    const result = inventoryReportPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })
})
