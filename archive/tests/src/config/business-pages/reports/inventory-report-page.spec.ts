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

  it('filters warehouses by stable warehouse ID', () => {
    const warehouseFilter = inventoryReportPageConfig.filters.find(
      (filter) => filter.label === 'modules.pages.inventoryReport.warehouse',
    )

    expect(warehouseFilter?.key).toBe('warehouseId')
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

  it('keeps stock comparisons visible and hides redundant identity fields by default', () => {
    const columnKeys = inventoryReportPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys = inventoryReportPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['brand', 'category', 'length', 'quantityUnit'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'materialCode',
        'material',
        'spec',
        'onHandQuantity',
        'reservedQuantity',
        'availableQuantity',
        'onHandWeightTon',
        'reservedWeightTon',
        'availableWeightTon',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
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

  it('shows on-hand, reserved and available quantities and weights', () => {
    const listKeys = inventoryReportPageConfig.columns.map(
      (column) => column.dataIndex,
    )

    expect(listKeys).toEqual(
      expect.arrayContaining([
        'onHandQuantity',
        'reservedQuantity',
        'availableQuantity',
        'onHandWeightTon',
        'reservedWeightTon',
        'availableWeightTon',
      ]),
    )
    expect(listKeys).not.toContain('quantity')
    expect(listKeys).not.toContain('weightTon')
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

  it('keeps quantity and weightTon fields for inventory flow items', () => {
    const detailItemKeys = inventoryReportPageConfig.detailItemColumns?.map(
      (column) => column.dataIndex,
    )

    expect(detailItemKeys).toEqual(
      expect.arrayContaining(['quantity', 'weightTon']),
    )
    expect(detailItemKeys).not.toEqual(
      expect.arrayContaining([
        'onHandQuantity',
        'reservedQuantity',
        'availableQuantity',
        'onHandWeightTon',
        'reservedWeightTon',
        'availableWeightTon',
      ]),
    )
  })

  it('summarizes on-hand, reserved and available weights', () => {
    const result = inventoryReportPageConfig.buildOverview!([
      {
        id: '1',
        onHandWeightTon: 12.5,
        reservedWeightTon: 2.25,
        availableWeightTon: 10.25,
      },
      {
        id: '2',
        onHandWeightTon: 7.5,
        reservedWeightTon: 1.75,
        availableWeightTon: 5.75,
      },
    ])

    expect(result).toEqual([
      {
        label: 'modules.pages.inventoryReport.stockRecordCount',
        value: '2',
      },
      {
        label: 'modules.pages.inventoryReport.onHandWeight',
        value: '20.000',
      },
      {
        label: 'modules.pages.inventoryReport.reservedWeight',
        value: '4.000',
      },
      {
        label: 'modules.pages.inventoryReport.availableWeight',
        value: '16.000',
      },
    ])
  })
})
