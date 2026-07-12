import { describe, expect, it } from 'vitest'
import { invoiceReceiptPageConfig } from './invoice-receipt-page'

describe('invoiceReceiptPageConfig', () => {
  const pi = invoiceReceiptPageConfig.parentImport!

  it('has required config fields', () => {
    expect(invoiceReceiptPageConfig.key).toBe('invoice-receipt')
    expect(invoiceReceiptPageConfig.title).toBeTruthy()
    expect(invoiceReceiptPageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(invoiceReceiptPageConfig.columns)).toBe(true)
    expect(invoiceReceiptPageConfig.saveFields?.lineItem).toEqual(
      expect.arrayContaining(['materialId', 'warehouseId']),
    )
    expect(invoiceReceiptPageConfig.saveFields?.scalar).toContain('supplierId')
    expect(
      invoiceReceiptPageConfig.filters.map((filter) => filter.key),
    ).toContain('supplierId')
    expect(
      invoiceReceiptPageConfig.formFields?.find(
        (field) => field.key === 'supplierId',
      ),
    ).toEqual(expect.objectContaining({ type: 'select', required: true }))
    expect(invoiceReceiptPageConfig.buildOverview).toBeTypeOf('function')
  })

  describe('parentImport', () => {
    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        settlementCompanyId: 'company-1',
        settlementCompanyName: '结算主体A',
      } as any)
      expect(draft).toEqual({
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        settlementCompanyId: 'company-1',
        settlementCompanyName: '结算主体A',
        invoiceTitle: '结算主体A',
      })
    })

    it('mapParentToDraft handles missing fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.supplierId).toBeUndefined()
      expect(draft.supplierName).toBe('')
      expect(draft.supplierCode).toBe('')
      expect(draft.settlementCompanyId).toBeUndefined()
      expect(draft.settlementCompanyName).toBe('')
      expect(draft.invoiceTitle).toBe('')
    })

    it('transformItems maps items with invoice-receipt fields', () => {
      const items = pi.transformItems!({
        orderNo: 'PO-001',
        id: 5,
        items: [
          {
            id: 1,
            materialName: '螺纹钢',
            weightTon: 10,
            amount: 5000,
            quantity: 100,
          },
        ],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('invoice-receipt-item-5-1')
      expect(items[0].sourceNo).toBe('PO-001')
      expect(items[0].sourcePurchaseOrderItemId).toBe(1)
      expect(items[0]._maxImportWeightTon).toBe(10)
      expect(items[0]._maxImportAmount).toBe(5000)
      expect(items[0].maxImportQuantity).toBe(100)
      expect(items[0].quantity).toBe(100)
    })

    it('transformItems uses empty sourceNo when parent orderNo is missing', () => {
      const items = pi.transformItems!({
        id: 5,
        items: [{ id: 1 }],
      } as any)
      expect(items[0].sourceNo).toBe('')
    })

    it('transformItems returns empty array when no items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
