import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  getSettlementCompanyOptions: () => [],
  getSupplierOptions: () => [],
}))

import { supplierRefundReceiptsPageConfig } from './supplier-refund-receipt-page'

describe('supplierRefundReceiptsPageConfig', () => {
  it('defines the supplier refund receipt module', () => {
    expect(supplierRefundReceiptsPageConfig.key).toBe('supplier-refund-receipt')
    expect(supplierRefundReceiptsPageConfig.primaryNoKey).toBe(
      'refundReceiptNo',
    )
    expect(supplierRefundReceiptsPageConfig.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataIndex: 'refundReceiptNo' }),
        expect.objectContaining({ dataIndex: 'supplierName' }),
        expect.objectContaining({ dataIndex: 'settlementCompanyName' }),
        expect.objectContaining({ dataIndex: 'amount', type: 'amount' }),
      ]),
    )
  })

  it('matches the backend request contract exactly', () => {
    expect(supplierRefundReceiptsPageConfig.saveFields?.scalar).toEqual([
      'refundReceiptNo',
      'purchaseRefundId',
      'receiptDate',
      'receiptMethod',
      'amount',
      'status',
      'operatorName',
      'remark',
    ])
  })

  it('keeps authoritative supplier and settlement snapshots readonly', () => {
    for (const key of [
      'purchaseRefundId',
      'supplierCode',
      'supplierName',
      'settlementCompanyName',
    ]) {
      expect(
        supplierRefundReceiptsPageConfig.formFields?.find(
          (field) => field.key === key,
        )?.disabled,
      ).toBe(true)
    }
  })

  it('selects only audited purchase refunds without enforcing uniqueness', () => {
    const parentImport = supplierRefundReceiptsPageConfig.parentImport

    expect(parentImport).toBeDefined()
    expect(parentImport!.parentModuleKey).toBe('purchase-refund')
    expect(parentImport!.parentFieldKey).toBe('purchaseRefundId')
    expect(parentImport!.parentDisplayFieldKey).toBe('refundNo')
    expect(parentImport!.enforceUniqueRelation).not.toBe(true)
    expect(parentImport!.buildParentFilters?.({ id: '' })).toEqual({
      status: '已审核',
    })
  })

  it('maps only source identity and authoritative snapshots from purchase refund', () => {
    expect(
      supplierRefundReceiptsPageConfig.parentImport?.mapParentToDraft?.({
        id: '301',
        refundNo: 'PR-001',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '401',
        settlementCompanyName: '结算主体甲',
        totalAmount: 1000,
      }),
    ).toEqual({
      purchaseRefundId: '301',
      supplierCode: 'SUP-001',
      supplierName: '供应商甲',
      settlementCompanyId: '401',
      settlementCompanyName: '结算主体甲',
    })
  })

  it('uses positive two-decimal receipt amount and draft/received statuses', () => {
    const amountField = supplierRefundReceiptsPageConfig.formFields?.find(
      (field) => field.key === 'amount',
    )
    const statusField = supplierRefundReceiptsPageConfig.formFields?.find(
      (field) => field.key === 'status',
    )

    expect(amountField).toEqual(
      expect.objectContaining({ min: 0.01, precision: 2, required: true }),
    )
    expect(statusField?.defaultValue).toBe('草稿')
    expect(statusField?.options).toEqual([
      expect.objectContaining({ value: '草稿' }),
      expect.objectContaining({ value: '已收款' }),
    ])
  })
})
