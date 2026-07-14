import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  customerOptions: [],
  enabledStatusOptions: [],
  getCustomerOptions: vi.fn(() => []),
  getCustomerProjectOptions: vi.fn(() => []),
  getSettlementCompanyOptions: vi.fn(() => []),
  getSupplierOptions: vi.fn(() => []),
}))

import { paymentPageConfigs } from './payment-pages'

describe('paymentPageConfigs', () => {
  it('contains receipt config', () => {
    expect(paymentPageConfigs.receipt).toBeDefined()
    expect(paymentPageConfigs.receipt.key).toBe('receipt')
  })

  it('contains payment config', () => {
    expect(paymentPageConfigs.payment).toBeDefined()
    expect(paymentPageConfigs.payment.key).toBe('payment')
  })

  it('contains cash reversal config', () => {
    expect(paymentPageConfigs['cash-reversal']).toBeDefined()
    expect(paymentPageConfigs['cash-reversal'].key).toBe('cash-reversal')
  })

  it('only exposes unified cash documents', () => {
    expect(Object.keys(paymentPageConfigs)).toEqual([
      'receipt',
      'payment',
      'cash-reversal',
    ])
  })

  it('uses audited supplier payments and receipts as reversal sources', () => {
    const config = paymentPageConfigs['cash-reversal']
    const parentImport = config.parentImport!
    const paymentDraft = { id: '', sourceType: '付款单' } as ModuleRecord
    const receiptDraft = { id: '', sourceType: '收款单' } as ModuleRecord

    expect(parentImport.resolveParentSelector?.(paymentDraft)).toEqual({
      parentModuleKey: 'payment',
      parentDisplayFieldKey: 'paymentNo',
    })
    expect(parentImport.buildParentFilters?.(paymentDraft)).toEqual({
      status: '已审核',
      businessType: '供应商',
    })
    expect(parentImport.resolveParentSelector?.(receiptDraft)).toEqual({
      parentModuleKey: 'receipt',
      parentDisplayFieldKey: 'receiptNo',
    })
    expect(parentImport.buildParentFilters?.(receiptDraft)).toEqual({
      status: '已审核',
      counterpartyType: '供应商',
    })
  })

  it('maps payment and receipt reversal sources exclusively', () => {
    const mapParentToDraft =
      paymentPageConfigs['cash-reversal'].parentImport?.mapParentToDraft

    expect(
      mapParentToDraft?.({
        id: '308251467645452280',
        paymentNo: 'PAY001',
        counterpartyType: '供应商',
        counterpartyId: '308251467645452281',
        counterpartyCode: 'SUP001',
        counterpartyName: '供应商甲',
        settlementCompanyId: '308251467645452282',
        settlementCompanyName: '结算主体甲',
        amount: 100,
      }),
    ).toMatchObject({
      sourceType: '付款单',
      sourceDocumentNo: 'PAY001',
      originalPaymentId: '308251467645452280',
      originalReceiptId: '',
      amount: 100,
    })

    expect(
      mapParentToDraft?.({
        id: '308251467645452290',
        receiptNo: 'REC001',
        counterpartyType: '供应商',
        counterpartyId: '308251467645452291',
        counterpartyName: '供应商乙',
        settlementCompanyId: '308251467645452292',
        settlementCompanyName: '结算主体乙',
        amount: 80,
      }),
    ).toMatchObject({
      sourceType: '收款单',
      sourceDocumentNo: 'REC001',
      originalPaymentId: '',
      originalReceiptId: '308251467645452290',
      amount: 80,
    })
  })
})
