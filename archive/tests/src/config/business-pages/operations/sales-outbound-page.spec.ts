import { describe, expect, it } from 'vitest'
import { salesOutboundsPageConfig } from './sales-outbound-page'

describe('salesOutboundPageConfig', () => {
  it('has required config fields', () => {
    expect(salesOutboundsPageConfig.key).toBe('sales-outbound')
    expect(salesOutboundsPageConfig.title).toBeTruthy()
    expect(salesOutboundsPageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(salesOutboundsPageConfig.filters)).toBe(true)
    expect(Array.isArray(salesOutboundsPageConfig.columns)).toBe(true)
    expect(salesOutboundsPageConfig.buildOverview).toBeTypeOf('function')
    expect(salesOutboundsPageConfig.actions).toEqual([])
    expect(salesOutboundsPageConfig.parentImport).toBeUndefined()
  })

  it('keeps core filters visible and moves advanced filters to the second row', () => {
    const keywordFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'keyword',
    )
    const customerFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'customerName',
    )
    const statusFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'status',
    )
    const advancedFilterKeys = [
      'productKeyword',
      'projectName',
      'settlementCompanyId',
      'outboundDate',
    ]

    expect(
      salesOutboundsPageConfig
        .filters!.filter((filter) => filter.row == null)
        .map((filter) => filter.key),
    ).toEqual(['keyword', 'customerName', 'status'])
    expect(keywordFilter?.row).toBeUndefined()
    expect(customerFilter?.row).toBeUndefined()
    expect(statusFilter?.row).toBeUndefined()
    expect(
      salesOutboundsPageConfig
        .filters!.filter((filter) => filter.row === 2)
        .map((filter) => filter.key),
    ).toEqual(advancedFilterKeys)
    for (const key of advancedFilterKeys) {
      expect(
        salesOutboundsPageConfig.filters!.find((filter) => filter.key === key)
          ?.row,
      ).toBe(2)
    }
  })

  it('shows source sales order and project in the default list layout', () => {
    const columnKeys = salesOutboundsPageConfig.columns.map(
      (column) => column.dataIndex,
    )

    expect(columnKeys).toContain('salesOrderNo')
    expect(salesOutboundsPageConfig.defaultHiddenColumnKeys).not.toContain(
      'salesOrderNo',
    )
    expect(salesOutboundsPageConfig.defaultHiddenColumnKeys).not.toContain(
      'projectName',
    )
    expect(salesOutboundsPageConfig.defaultHiddenColumnKeys).toEqual(['remark'])
  })
})
