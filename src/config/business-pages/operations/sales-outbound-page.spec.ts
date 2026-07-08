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

  it('does not force customer and project into manual rows', () => {
    const customerFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'customerName',
    )
    const projectFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'projectName',
    )

    expect(customerFilter?.row).toBeUndefined()
    expect(projectFilter?.row).toBeUndefined()
  })

  it('allows filtering pre outbound sales outbounds', () => {
    const statusFilter = salesOutboundsPageConfig.filters!.find(
      (filter) => filter.key === 'status',
    )

    expect(statusFilter?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '预出库' }),
        expect.objectContaining({ value: '已审核' }),
      ]),
    )
  })

  it('allows saving sales outbounds as pre outbound', () => {
    const statusField = salesOutboundsPageConfig.formFields!.find(
      (field) => field.key === 'status',
    )

    expect(statusField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '草稿' }),
        expect.objectContaining({ value: '预出库' }),
        expect.objectContaining({ value: '已审核' }),
      ]),
    )
  })

  it('has charge item save fields', () => {
    expect(salesOutboundsPageConfig.saveFields?.chargeItem).toEqual(
      expect.arrayContaining([
        'chargeName',
        'chargeDirection',
        'settlementPartyType',
        'settlementPartyId',
        'settlementPartyName',
        'amount',
        'billable',
        'remark',
      ]),
    )
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
