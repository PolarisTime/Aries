import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { paymentsPageConfig } from './payment-page'

describe('paymentsPageConfig', () => {
  it('has correct key', () => {
    expect(paymentsPageConfig.key).toBe('payment')
  })

  it('has primaryNoKey', () => {
    expect(paymentsPageConfig.primaryNoKey).toBe('paymentNo')
  })

  it('has filters', () => {
    expect(paymentsPageConfig.filters).toBeDefined()
    expect(paymentsPageConfig.filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(paymentsPageConfig.columns).toBeDefined()
    expect(paymentsPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has formFields', () => {
    expect(paymentsPageConfig.formFields).toBeDefined()
  })

  it('has saveFields', () => {
    expect(paymentsPageConfig.saveFields).toBeDefined()
    expect(paymentsPageConfig.saveFields!.scalar).toContain('paymentNo')
  })

  it('supports statement settlement and purchase prepayment purposes', () => {
    const purposeField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'paymentPurpose',
    )

    expect(purposeField).toBeDefined()
    expect(purposeField!.defaultValue).toBe('STATEMENT_SETTLEMENT')
    expect(purposeField!.options).toEqual([
      expect.objectContaining({ value: 'STATEMENT_SETTLEMENT' }),
      expect.objectContaining({ value: 'PURCHASE_PREPAYMENT' }),
    ])
  })

  it('renders payment purpose labels instead of internal enum values', () => {
    const purposeColumn = paymentsPageConfig.columns.find(
      (column) => column.dataIndex === 'paymentPurpose',
    )

    expect(purposeColumn?.render?.('STATEMENT_SETTLEMENT', { id: '1' })).toBe(
      'modules.pages.payment.statementSettlement',
    )
    expect(purposeColumn?.render?.('PURCHASE_PREPAYMENT', { id: '2' })).toBe(
      'modules.pages.payment.purchasePrepayment',
    )
    expect(purposeColumn?.render?.('UNKNOWN', { id: '3' })).toBe('UNKNOWN')
  })

  it('shows statement allocation only for statement settlement', () => {
    const statementField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'sourceStatementId',
    )

    expect(
      statementField?.visibleWhen?.({
        paymentPurpose: 'STATEMENT_SETTLEMENT',
      }),
    ).toBe(true)
    expect(
      statementField?.visibleWhen?.({
        paymentPurpose: 'PURCHASE_PREPAYMENT',
      }),
    ).toBe(false)
    expect(statementField?.preserve).toBe(false)
  })

  it('locks supplier business type and exposes authoritative snapshots for purchase prepayment', () => {
    const businessTypeField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'businessType',
    )
    expect(
      businessTypeField?.disabledWhen?.({
        paymentPurpose: 'PURCHASE_PREPAYMENT',
      }),
    ).toBe(true)

    for (const key of [
      'sourcePurchaseOrderId',
      'purchaseOrderNo',
      'supplierCode',
      'supplierName',
      'settlementCompanyName',
    ]) {
      const field = paymentsPageConfig.formFields!.find(
        (candidate) => candidate.key === key,
      )
      expect(field?.disabled).toBe(true)
      expect(
        field?.visibleWhen?.({
          paymentPurpose: 'PURCHASE_PREPAYMENT',
        }),
      ).toBe(true)
      expect(
        field?.visibleWhen?.({
          paymentPurpose: 'STATEMENT_SETTLEMENT',
        }),
      ).toBe(false)
    }
  })

  it('imports purchase order snapshots for purchase prepayment', () => {
    const parentImport = paymentsPageConfig.parentImport

    expect(parentImport).toBeDefined()
    expect(parentImport!.parentModuleKey).toBe('purchase-order')
    expect(parentImport!.candidateQueryType).toBe('purchase-prepayment')
    expect(
      parentImport!.visibleWhen?.({
        paymentPurpose: 'PURCHASE_PREPAYMENT',
      } as any),
    ).toBe(true)
    expect(
      parentImport!.visibleWhen?.({
        paymentPurpose: 'STATEMENT_SETTLEMENT',
      } as any),
    ).toBe(false)
    expect(
      parentImport!.mapParentToDraft?.({
        id: '101',
        orderNo: 'PO-001',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '201',
        settlementCompanyName: '结算主体甲',
        totalAmount: 1280.5,
      }),
    ).toEqual({
      businessType: '供应商',
      counterpartyCode: 'SUP-001',
      counterpartyName: '供应商甲',
      sourcePurchaseOrderId: '101',
      purchaseOrderNo: 'PO-001',
      supplierCode: 'SUP-001',
      supplierName: '供应商甲',
      settlementCompanyId: '201',
      settlementCompanyName: '结算主体甲',
      amount: 1280.5,
    })
  })

  it('derives purchase prepayment amount from authoritative detail lines with line-level cent rounding', () => {
    const draft = paymentsPageConfig.parentImport?.mapParentToDraft?.({
      id: '101',
      orderNo: 'PO-001',
      totalAmount: 999,
      items: [
        {
          id: '1',
          quantity: '1',
          pieceWeightTon: '1',
          unitPrice: '1.005',
        },
        {
          id: '2',
          quantity: 1,
          pieceWeightTon: 1,
          unitPrice: 2.005,
        },
      ],
    })

    expect(draft?.amount).toBe(3.02)
  })

  it('submits the complete backend payment purpose contract', () => {
    expect(paymentsPageConfig.saveFields!.scalar).toEqual(
      expect.arrayContaining([
        'paymentPurpose',
        'sourcePurchaseOrderId',
        'purchaseOrderNo',
        'supplierCode',
        'supplierName',
        'settlementCompanyId',
        'settlementCompanyName',
      ]),
    )
  })

  it('buildOverview returns result', () => {
    const result = paymentsPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
