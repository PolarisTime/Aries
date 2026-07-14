import { describe, expect, it } from 'vitest'
import { getModulePageSchema } from './module-page-schema'

describe('module-page-schema', () => {
  describe('getModulePageSchema', () => {
    it('returns schema for purchase-order', () => {
      const schema = getModulePageSchema('purchase-order')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(5)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].label).toBe('订单编号')
      expect(schema.filters![0].type).toBe('input')
      expect(schema.filters![1].key).toBe('supplierId')
      expect(schema.filters![1].type).toBe('select')
      expect(schema.filters![2].key).toBe('settlementCompanyId')
      expect(schema.filters![2].type).toBe('select')
      expect(schema.filters![3].key).toBe('status')
      expect(schema.filters![3].type).toBe('select')
      expect(schema.filters![4].key).toBe('orderDate')
      expect(schema.filters![4].type).toBe('dateRange')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyName')
      expect(schema.saveFields!.scalar).toContain('supplierCode')
      expect(schema.saveFields!.scalar).toContain('supplierId')
    })

    it('returns schema for purchase-inbound', () => {
      const schema = getModulePageSchema('purchase-inbound')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(5)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].label).toBe('入库单号')
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'settlementCompanyId',
      )
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'supplierId',
      )
      expect(schema.filters![4].key).toBe('inboundDate')
      expect(schema.filters![4].label).toBe('入库日期')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('supplierCode')
      expect(schema.saveFields!.scalar).toContain('supplierId')
      expect(schema.saveFields!.lineItem).toContain('settlementCompanyId')
    })

    it('returns schema for purchase-refund', () => {
      const schema = getModulePageSchema('purchase-refund')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toEqual([
        'keyword',
        'supplierId',
        'settlementCompanyId',
        'status',
        'refundDate',
      ])
      expect(schema.saveFields!.scalar).toEqual([
        'refundNo',
        'sourcePurchaseOrderId',
        'refundDate',
        'status',
        'operatorName',
        'remark',
      ])
      expect(schema.saveFields!.lineItem).toBeUndefined()
    })

    it('returns schema for sales-order with productKeyword filter', () => {
      const schema = getModulePageSchema('sales-order')
      expect(schema).toBeDefined()
      expect(schema.filters).toHaveLength(7)
      expect(schema.filters![0].key).toBe('keyword')
      expect(schema.filters![0].clientSearchKeys).toEqual(['orderNo'])
      expect(schema.filters![1].key).toBe('productKeyword')
      expect(schema.filters![1].label).toBe('商品信息')
      expect(schema.filters![1].clientSearchLineItemKeys).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'settlementCompanyId',
      )
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('customerId')
      expect(schema.saveFields!.scalar).toContain('projectId')
      expect(schema.saveFields!.lineItem).toContain('settlementCompanyId')
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
      expect(schema.filters).toHaveLength(7)
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'settlementCompanyId',
      )
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toContain('settlementCompanyId')
    })

    it('returns schema for receipt with saveFields only', () => {
      const schema = getModulePageSchema('receipt')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('receiptNo')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyName')
      expect(schema.saveFields!.scalar).toContain('customerId')
      expect(schema.saveFields!.scalar).toContain('customerName')
      expect(schema.saveFields!.scalar).toContain('projectId')
      expect(schema.saveFields!.scalar).toContain('sourceCustomerStatementId')
      expect(schema.saveFields!.scalar).not.toContain('sourceStatementId')
      expect(schema.saveFields!.scalar).toContain('payType')
      expect(schema.saveFields!.scalar).toContain('amount')
      expect(schema.saveFields!.lineItem).toEqual([
        'sourceCustomerStatementId',
        'allocatedAmount',
      ])
      expect(schema.filters).toBeUndefined()
    })

    it('returns schema for payment with saveFields only', () => {
      const schema = getModulePageSchema('payment')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('paymentNo')
      expect(schema.saveFields!.scalar).toContain('counterpartyType')
      expect(schema.saveFields!.scalar).toContain('counterpartyId')
      expect(schema.saveFields!.scalar).not.toContain('businessType')
      expect(schema.saveFields!.scalar).not.toContain('sourceStatementId')
      expect(schema.saveFields!.scalar).toContain('counterpartyName')
      expect(schema.saveFields!.scalar).toContain('paymentPurpose')
      expect(schema.saveFields!.scalar).toContain('sourcePurchaseOrderId')
      expect(schema.saveFields!.scalar).toContain('purchaseOrderNo')
      expect(schema.saveFields!.scalar).toContain('supplierCode')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toEqual([
        'sourceSupplierStatementId',
        'sourceFreightStatementId',
        'allocatedAmount',
      ])
    })

    it('returns schema for cash-reversal with one source id', () => {
      const schema = getModulePageSchema('cash-reversal')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toEqual([
        'reversalNo',
        'originalPaymentId',
        'originalReceiptId',
        'reversalDate',
        'amount',
        'reason',
        'status',
        'operatorName',
        'remark',
      ])
    })

    it('returns schema for supplier-refund-receipt', () => {
      const schema = getModulePageSchema('supplier-refund-receipt')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toEqual([
        'keyword',
        'supplierId',
        'settlementCompanyId',
        'status',
        'receiptDate',
      ])
      expect(schema.saveFields!.scalar).toEqual([
        'refundReceiptNo',
        'purchaseRefundId',
        'supplierId',
        'receiptDate',
        'receiptMethod',
        'amount',
        'status',
        'operatorName',
        'remark',
      ])
      expect(schema.saveFields!.lineItem).toBeUndefined()
    })

    it('returns schema for ledger-adjustment with saveFields only', () => {
      const schema = getModulePageSchema('ledger-adjustment')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('adjustmentNo')
      expect(schema.saveFields!.scalar).toContain('counterpartyType')
      expect(schema.saveFields!.scalar).toContain('counterpartyId')
      expect(schema.saveFields!.scalar).toContain('counterpartyCode')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyName')
      expect(schema.saveFields!.scalar).toContain('effect')
      expect(schema.saveFields!.lineItem).toBeUndefined()
    })

    it('returns schema for supplier-statement', () => {
      const schema = getModulePageSchema('supplier-statement')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'supplierId',
      )
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('sourceInboundNos')
      expect(schema.saveFields!.scalar).toContain('supplierName')
      expect(schema.saveFields!.scalar).toContain('supplierId')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toContain('sourceNo')
      expect(schema.saveFields!.lineItem).toContain('weighWeightTon')
      expect(schema.saveFields!.lineItem).toContain('weightAdjustmentTon')
    })

    it('returns schema for customer-statement', () => {
      const schema = getModulePageSchema('customer-statement')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toEqual(
        expect.arrayContaining(['customerId', 'projectId']),
      )
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('sourceOrderNos')
      expect(schema.saveFields!.scalar).toContain('customerId')
      expect(schema.saveFields!.scalar).toContain('customerName')
      expect(schema.saveFields!.scalar).toContain('projectId')
      expect(schema.saveFields!.scalar).toContain('projectName')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toEqual(
        expect.arrayContaining([
          'sourceNo',
          'sourceSalesOrderItemId',
          'customerId',
          'projectId',
          'warehouseId',
        ]),
      )
    })

    it('returns schema for purchase-contract', () => {
      const schema = getModulePageSchema('purchase-contract')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'supplierId',
      )
      expect(schema.saveFields!.scalar).toContain('contractNo')
      expect(schema.saveFields!.scalar).toContain('supplierName')
      expect(schema.saveFields!.scalar).toContain('supplierId')
      expect(schema.saveFields!.scalar).toContain('supplierCode')
      expect(schema.saveFields!.scalar).toContain('sourcePurchaseOrderNos')
      expect(schema.saveFields!.scalar).toContain('signDate')
      expect(schema.saveFields!.scalar).toContain('effectiveDate')
      expect(schema.saveFields!.scalar).toContain('expireDate')
    })

    it('returns schema for freight-bill with a stable carrier identity', () => {
      const schema = getModulePageSchema('freight-bill')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('carrierCode')
      expect(schema.saveFields!.scalar).toContain('carrierName')
    })

    it('returns schema for freight-statement', () => {
      const schema = getModulePageSchema('freight-statement')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toContain('carrierId')
      expect(schema.saveFields!.scalar).toContain('statementNo')
      expect(schema.saveFields!.scalar).toContain('carrierId')
      expect(schema.saveFields!.scalar).toContain('carrierCode')
      expect(schema.saveFields!.scalar).toContain('carrierName')
      expect(schema.saveFields!.scalar).toContain('totalWeight')
      expect(schema.saveFields!.scalar).toContain('totalFreight')
      expect(schema.saveFields!.scalar).toContain('signStatus')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toContain('sourceNo')
      expect(schema.saveFields!.lineItem).toContain('sourceSalesOutboundItemId')
      expect(schema.saveFields!.lineItem).toContain('settlementCompanyId')
      expect(schema.saveFields!.lineItem).toContain('customerName')
      expect(schema.saveFields!.lineItem).toEqual(
        expect.arrayContaining(['customerId', 'projectId']),
      )
    })

    it('keeps stable material and warehouse ids in every line item whitelist', () => {
      const modulesWithMaterial = [
        'purchase-inbound',
        'sales-order',
        'sales-outbound',
        'freight-bill',
        'supplier-statement',
        'customer-statement',
        'purchase-contract',
        'sales-contract',
        'freight-statement',
      ]
      const modulesWithWarehouse = [
        'purchase-inbound',
        'sales-order',
        'sales-outbound',
        'freight-bill',
        'freight-statement',
      ]

      for (const moduleKey of modulesWithMaterial) {
        expect(
          getModulePageSchema(moduleKey)?.saveFields?.lineItem,
          `${moduleKey} materialId`,
        ).toContain('materialId')
      }
      for (const moduleKey of modulesWithWarehouse) {
        expect(
          getModulePageSchema(moduleKey)?.saveFields?.lineItem,
          `${moduleKey} warehouseId`,
        ).toContain('warehouseId')
      }
    })

    it('keeps freight statement source bill ids in its line item whitelist', () => {
      expect(
        getModulePageSchema('freight-statement')?.saveFields?.lineItem,
      ).toEqual(
        expect.arrayContaining([
          'sourceFreightBillId',
          'sourceFreightBillItemId',
        ]),
      )
    })

    it('limits contract line identity to materialId only', () => {
      for (const moduleKey of ['purchase-contract', 'sales-contract']) {
        const lineItemFields =
          getModulePageSchema(moduleKey)?.saveFields?.lineItem || []

        expect(lineItemFields, `${moduleKey} materialId`).toContain(
          'materialId',
        )
        expect(lineItemFields, `${moduleKey} warehouseId`).not.toContain(
          'warehouseId',
        )
      }
    })

    it('returns schema for invoice-receipt', () => {
      const schema = getModulePageSchema('invoice-receipt')
      expect(schema).toBeDefined()
      expect(schema.filters!.map((filter) => filter.key)).toContain(
        'supplierId',
      )
      expect(schema.saveFields!.scalar).toContain('receiveNo')
      expect(schema.saveFields!.scalar).toContain('invoiceNo')
      expect(schema.saveFields!.scalar).toContain('invoiceTitle')
      expect(schema.saveFields!.scalar).toContain('taxRate')
      expect(schema.saveFields!.scalar).toContain('taxAmount')
      expect(schema.saveFields!.scalar).toContain('supplierCode')
      expect(schema.saveFields!.scalar).toContain('supplierId')
    })

    it('returns schema for invoice-issue', () => {
      const schema = getModulePageSchema('invoice-issue')
      expect(schema).toBeDefined()
      expect(schema.saveFields!.scalar).toContain('issueNo')
      expect(schema.saveFields!.scalar).toContain('invoiceNo')
      expect(schema.saveFields!.scalar).toContain('sourceSalesOrderNos')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyId')
      expect(schema.saveFields!.scalar).toContain('settlementCompanyName')
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
