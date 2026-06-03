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

  describe('parentImport', () => {
    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        customerName: '客户A',
        projectName: '项目X',
      } as any)
      expect(draft).toEqual({
        customerName: '客户A',
        projectName: '项目X',
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

    it('transformItems returns empty array when no items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
