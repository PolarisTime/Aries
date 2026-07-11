import { describe, expect, it } from 'vitest'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { modulePageMetaMap } from '@/config/module-page-meta'

const autoNumberedCreatableModules = [
  'material',
  'material-categories',
  'supplier',
  'customer',
  'carrier',
  'warehouse',
  'purchase-order',
  'purchase-inbound',
  'purchase-refund',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'purchase-contract',
  'sales-contract',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
  'supplier-refund-receipt',
  'ledger-adjustment',
  'invoice-receipt',
  'invoice-issue',
  'department',
]

describe('modulePageMetaMap', () => {
  it('declares primary number fields for creatable auto-numbered pages', () => {
    expect(
      Object.fromEntries(
        autoNumberedCreatableModules.map((moduleKey) => [
          moduleKey,
          modulePageMetaMap[moduleKey]?.primaryNoKey,
        ]),
      ),
    ).toEqual({
      material: 'materialCode',
      'material-categories': 'categoryCode',
      supplier: 'supplierCode',
      customer: 'customerCode',
      carrier: 'carrierCode',
      warehouse: 'warehouseCode',
      'purchase-order': 'orderNo',
      'purchase-inbound': 'inboundNo',
      'purchase-refund': 'refundNo',
      'sales-order': 'orderNo',
      'sales-outbound': 'outboundNo',
      'freight-bill': 'billNo',
      'purchase-contract': 'contractNo',
      'sales-contract': 'contractNo',
      'supplier-statement': 'statementNo',
      'customer-statement': 'statementNo',
      'freight-statement': 'statementNo',
      receipt: 'receiptNo',
      payment: 'paymentNo',
      'supplier-refund-receipt': 'refundReceiptNo',
      'ledger-adjustment': 'adjustmentNo',
      'invoice-receipt': 'receiveNo',
      'invoice-issue': 'issueNo',
      department: 'departmentCode',
    })
  })

  it('stays aligned with loaded creatable page configs', {
    timeout: 30000,
  }, async () => {
    const missingMeta = []

    for (const moduleKey of autoNumberedCreatableModules) {
      const config = await loadBusinessPageConfig(moduleKey)
      if (
        !config.readOnly &&
        config.primaryNoKey &&
        !modulePageMetaMap[moduleKey]?.primaryNoKey
      ) {
        missingMeta.push(moduleKey)
      }
    }

    expect(missingMeta).toEqual([])
  })
})
