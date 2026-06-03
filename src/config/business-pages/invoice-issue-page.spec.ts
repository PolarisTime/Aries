import { describe, expect, it } from 'vitest'
import { invoiceIssuePageConfig } from './invoice-issue-page'

describe('invoiceIssuePageConfig', () => {
  const pi = invoiceIssuePageConfig.parentImport!

  it('has required config fields', () => {
    expect(invoiceIssuePageConfig.key).toBe('invoice-issue')
    expect(invoiceIssuePageConfig.title).toBeTruthy()
    expect(invoiceIssuePageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(invoiceIssuePageConfig.columns)).toBe(true)
    expect(invoiceIssuePageConfig.buildOverview).toBeTypeOf('function')
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

    it('transformItems maps items with invoice-issue fields', () => {
      const items = pi.transformItems!({
        orderNo: 'SO-001',
        id: 5,
        items: [
          { id: 1, materialName: '螺纹钢', weightTon: 10, amount: 5000, quantity: 100 },
        ],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('invoice-issue-item-5-1')
      expect(items[0].sourceNo).toBe('SO-001')
      expect(items[0].sourceSalesOrderItemId).toBe(1)
      expect(items[0]._maxImportWeightTon).toBe(10)
      expect(items[0]._maxImportAmount).toBe(5000)
      expect(items[0].maxImportQuantity).toBe(100)
    })

    it('transformItems returns empty array when no items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
