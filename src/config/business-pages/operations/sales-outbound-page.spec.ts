import { describe, expect, it } from 'vitest'
import { salesOutboundsPageConfig } from './sales-outbound-page'

describe('salesOutboundPageConfig', () => {
  const pi = salesOutboundsPageConfig.parentImport!

  it('has required config fields', () => {
    expect(salesOutboundsPageConfig.key).toBe('sales-outbound')
    expect(salesOutboundsPageConfig.title).toBeTruthy()
    expect(salesOutboundsPageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(salesOutboundsPageConfig.filters)).toBe(true)
    expect(Array.isArray(salesOutboundsPageConfig.columns)).toBe(true)
    expect(salesOutboundsPageConfig.buildOverview).toBeTypeOf('function')
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

  describe('parentImport', () => {
    it('filters audited parent sales orders and hides the status selector column', () => {
      expect(pi.candidateQueryType).toBe('sales-order-outbound-import')
      expect(pi.buildParentFilters?.({ id: '1' } as any)).toEqual({
        status: '已审核',
      })
      expect(pi.hiddenSelectorColumnKeys).toContain('status')
    })

    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        customerName: '客户A',
        projectName: '项目X',
      } as any)
      expect(draft).toEqual({
        customerName: '客户A',
        projectName: '项目X',
        settlementCompanyId: undefined,
        settlementCompanyName: '',
      })
    })

    it('mapParentToDraft handles missing fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.customerName).toBe('')
      expect(draft.projectName).toBe('')
    })

    it('transformItems clones and maps items', () => {
      const items = pi.transformItems!({
        orderNo: 'SO-001',
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].sourceNo).toBe('SO-001')
      expect(items[0].sourceSalesOrderItemId).toBe(1)
    })

    it('transformItems uses empty sourceNo when parent orderNo is missing', () => {
      const items = pi.transformItems!({
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items[0].sourceNo).toBe('')
    })

    it('transformItems returns empty array when no items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
