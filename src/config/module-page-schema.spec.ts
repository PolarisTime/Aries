import { describe, expect, it } from 'vitest'
import { getModulePageSchema } from './module-page-schema'

describe('module-page-schema', () => {
  describe('getModulePageSchema', () => {
    it('returns schema for purchase-order', () => {
      const schema = getModulePageSchema('purchase-order')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(4)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].label).toBe('订单编号')
      expect(schema.filters![0].type).toBe('input')
      expect(schema.filters![1].key).toBe('supplierName')
      expect(schema.filters![1].type).toBe('select')
      expect(schema.filters![2].key).toBe('status')
      expect(schema.filters![2].type).toBe('select')
      expect(schema.filters![3].key).toBe('orderDate')
      expect(schema.filters![3].type).toBe('dateRange')
      expect(schema.saveFields).toBeUndefined()
    })

    it('returns schema for purchase-inbound', () => {
      const schema = getModulePageSchema('purchase-inbound')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(4)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].label).toBe('入库单号')
      expect(schema.filters![3].key).toBe('inboundDate')
      expect(schema.filters![3].label).toBe('入库日期')
    })

    it('returns schema for sales-order with productKeyword filter', () => {
      const schema = getModulePageSchema('sales-order')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(6)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].clientSearchKeys).toEqual(['orderNo'])
      expect(schema.filters![1].key).toBe('productKeyword')
      expect(schema.filters![1].label).toBe('商品信息')
      expect(schema.filters![1].clientSearchLineItemKeys).toBeDefined()
    })

    it('returns schema for sales-outbound with saveFields', () => {
      const schema = getModulePageSchema('sales-outbound')
      expect(schema).toBeDefined()
      expect(schema.saveFields).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('outboundNo')
      expect(schema.saveFields!.scalar).toContain('salesOrderNo')
      expect(schema.saveFields!.scalar).toContain('customerName')
      expect(schema.saveFields!.lineItem).toContain('materialCode')
      expect(schema.saveFields!.lineItem).toContain('unitPrice')
      expect(schema.saveFields!.lineItem).toContain('amount')
      expect(schema.filters).toBeDefined()
      expect(schema.filters).toHaveLength(6)
    })

    it('returns schema for receipt with saveFields only', () => {
      const schema = getModulePageSchema('receipt')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('receiptNo')
      expect(schema.saveFields!.scalar).toContain('customerName')
      expect(schema.saveFields!.scalar).toContain('payType')
      expect(schema.saveFields!.scalar).toContain('amount')
      expect(schema.filters).toBeUndefined()
    })

    it('returns schema for payment with saveFields only', () => {
      const schema = getModulePageSchema('payment')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('paymentNo')
      expect(schema.saveFields!.scalar).toContain('businessType')
      expect(schema.saveFields!.scalar).toContain('counterpartyName')
      expect(schema.saveFields!.lineItem).toBeUndefined()
    })

    it('returns schema for supplier-statement', () => {
      const schema = getModulePageSchema('supplier-statement')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('sourceInboundNos')
      expect(schema.saveFields!.scalar).toContain('supplierName')
      expect(schema.saveFields!.lineItem).toContain('sourceNo')
      expect(schema.saveFields!.lineItem).toContain('weighWeightTon')
      expect(schema.saveFields!.lineItem).toContain('weightAdjustmentTon')
    })

    it('returns schema for customer-statement', () => {
      const schema = getModulePageSchema('customer-statement')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('sourceOrderNos')
      expect(schema.saveFields!.scalar).toContain('customerName')
      expect(schema.saveFields!.scalar).toContain('projectName')
      expect(schema.saveFields!.lineItem).toContain('sourceNo')
    })

    it('returns schema for purchase-contract', () => {
      const schema = getModulePageSchema('purchase-contract')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('contractNo')
      expect(schema.saveFields!.scalar).toContain('supplierName')
      expect(schema.saveFields!.scalar).toContain('sourcePurchaseOrderNos')
      expect(schema.saveFields!.scalar).toContain('signDate')
      expect(schema.saveFields!.scalar).toContain('effectiveDate')
      expect(schema.saveFields!.scalar).toContain('expireDate')
    })

    it('returns schema for freight-statement', () => {
      const schema = getModulePageSchema('freight-statement')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('carrierName')
      expect(schema.saveFields!.scalar).toContain('totalWeight')
      expect(schema.saveFields!.scalar).toContain('totalFreight')
      expect(schema.saveFields!.scalar).toContain('signStatus')
      expect(schema.saveFields!.lineItem).toContain('sourceNo')
      expect(schema.saveFields!.lineItem).toContain('customerName')
    })

    it('returns schema for invoice-receipt', () => {
      const schema = getModulePageSchema('invoice-receipt')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('receiveNo')
      expect(schema.saveFields!.scalar).toContain('invoiceNo')
      expect(schema.saveFields!.scalar).toContain('invoiceTitle')
      expect(schema.saveFields!.scalar).toContain('taxRate')
      expect(schema.saveFields!.scalar).toContain('taxAmount')
    })

    it('returns schema for invoice-issue', () => {
      const schema = getModulePageSchema('invoice-issue')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('issueNo')
      expect(schema.saveFields!.scalar).toContain('invoiceNo')
      expect(schema.saveFields!.scalar).toContain('sourceSalesOrderNos')
      expect(schema.saveFields!.scalar).toContain('targetAmount')
    })

    it('returns undefined for unknown module key', () => {
      expect(getModulePageSchema('unknown-module')).toBeUndefined()
    })

    it('returns undefined for empty string key', () => {
      expect(getModulePageSchema('')).toBeUndefined()
    })
  })
})
