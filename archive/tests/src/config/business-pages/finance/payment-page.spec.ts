import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/api/carrier-options', () => ({
  getCarrierEntityOptions: vi.fn(() => [
    { id: '501', label: 'CAR-001 / 承运商A', value: '501' },
  ]),
}))

vi.mock('@/api/supplier-options', () => ({
  getSupplierEntityOptions: vi.fn(() => [
    { id: '401', label: 'SUP-001 / 供应商A', value: '401' },
  ]),
}))

import { getCarrierEntityOptions } from '@/api/carrier-options'
import { getSupplierEntityOptions } from '@/api/supplier-options'
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
      expect.objectContaining({ value: 'SUPPLIER_PAYMENT' }),
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
    const supplierStatementField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'sourceSupplierStatementId',
    )
    const freightStatementField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'sourceFreightStatementId',
    )

    expect(
      supplierStatementField?.visibleWhen?.({
        paymentPurpose: 'STATEMENT_SETTLEMENT',
        counterpartyType: '供应商',
      }),
    ).toBe(true)
    expect(
      supplierStatementField?.visibleWhen?.({
        paymentPurpose: 'PURCHASE_PREPAYMENT',
        counterpartyType: '供应商',
      }),
    ).toBe(false)
    expect(
      freightStatementField?.visibleWhen?.({
        paymentPurpose: 'STATEMENT_SETTLEMENT',
        counterpartyType: '物流商',
      }),
    ).toBe(true)
    expect(supplierStatementField?.preserve).toBe(false)
    expect(freightStatementField?.preserve).toBe(false)
  })

  it('uses a typed counterparty identity and never saves a generic statement id', () => {
    const fieldKeys = paymentsPageConfig.formFields?.map((field) => field.key)
    const detailKeys = paymentsPageConfig.detailFields.map((field) => field.key)
    const saveFields = paymentsPageConfig.saveFields?.scalar || []

    expect(fieldKeys).toEqual(
      expect.arrayContaining([
        'counterpartyType',
        'counterpartyId',
        'sourceSupplierStatementId',
        'sourceFreightStatementId',
      ]),
    )
    expect(fieldKeys).not.toContain('sourceStatementId')
    expect(detailKeys).toEqual(
      expect.arrayContaining([
        'sourceSupplierStatementId',
        'sourceFreightStatementId',
      ]),
    )
    expect(detailKeys).not.toContain('sourceStatementId')
    expect(saveFields).toEqual(
      expect.arrayContaining(['counterpartyType', 'counterpartyId']),
    )
    expect(saveFields).not.toContain('businessType')
    expect(saveFields).not.toContain('sourceStatementId')
  })

  it('uses snowflake ids as supplier and carrier selector values', () => {
    const counterpartyField = paymentsPageConfig.formFields?.find(
      (field) => field.key === 'counterpartyId',
    )
    const options = counterpartyField?.options as (form?: any) => any[]

    expect(options({ counterpartyType: '供应商' })[0]).toMatchObject({
      value: '401',
    })
    expect(getSupplierEntityOptions).toHaveBeenCalled()
    expect(options({ counterpartyType: '物流商' })[0]).toMatchObject({
      value: '501',
    })
    expect(getCarrierEntityOptions).toHaveBeenCalled()
  })

  it('declares all master data required by the dynamic counterparty selector', () => {
    const counterpartyField = paymentsPageConfig.formFields?.find(
      (field) => field.key === 'counterpartyId',
    ) as
      | {
          masterOptionRequirements?: {
            suppliers?: boolean
            carriers?: boolean
          }
        }
      | undefined

    expect(counterpartyField?.masterOptionRequirements).toEqual({
      suppliers: true,
      carriers: true,
    })
  })

  it('locks supplier business type and exposes authoritative snapshots for purchase prepayment', () => {
    const counterpartyTypeField = paymentsPageConfig.formFields!.find(
      (field) => field.key === 'counterpartyType',
    )
    expect(
      counterpartyTypeField?.disabledWhen?.({
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
      parentImport!.buildParentFilters?.({
        id: '1',
        counterpartyType: '供应商',
        counterpartyId: '700520000000000001',
      }),
    ).toEqual({ supplierId: '700520000000000001' })
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
        supplierId: '301',
        settlementCompanyId: '201',
        settlementCompanyName: '结算主体甲',
        totalAmount: 1280.5,
      }),
    ).toEqual({
      counterpartyType: '供应商',
      counterpartyId: '301',
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
