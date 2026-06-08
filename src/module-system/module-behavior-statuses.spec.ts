import { describe, expect, it, vi } from 'vitest'

vi.mock('./module-behavior-registry-core', () => ({
  registerModuleBehavior: vi.fn(),
}))

import { registerModuleBehavior } from './module-behavior-registry-core'
import {
  protectedDeleteStatuses,
  protectedEditStatuses,
} from './module-behavior-statuses'

const mockedRegister = vi.mocked(registerModuleBehavior)

describe('module-behavior-statuses', () => {
  const lineItemModules = [
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'freight-bill',
    'freight-statement',
    'purchase-contract',
    'sales-contract',
    'invoice-receipt',
    'invoice-issue',
  ]

  const amountModules = [
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'purchase-contract',
    'sales-contract',
  ]

  const draftStatusModules: Record<string, string> = {
    'purchase-order': '草稿',
    'purchase-inbound': '草稿',
    'sales-order': '草稿',
    'sales-outbound': '草稿',
    'freight-bill': '未审核',
    'freight-statement': '待审核',
    'supplier-statement': '待确认',
    'customer-statement': '待确认',
    receipt: '草稿',
    payment: '草稿',
    'invoice-receipt': '草稿',
    'invoice-issue': '草稿',
    'ledger-adjustment': '草稿',
  }

  const approvedStatusModules = [
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'freight-bill',
    'freight-statement',
  ]

  it.each(
    lineItemModules,
  )('registers supportsLineItems for %s', (moduleKey) => {
    const call = mockedRegister.mock.calls.find(
      ([key, config]) => key === moduleKey && config.supportsLineItems === true,
    )
    expect(call).toBeDefined()
  })

  it.each(amountModules)('registers computesAmounts for %s', (moduleKey) => {
    const call = mockedRegister.mock.calls.find(
      ([key, config]) => key === moduleKey && config.computesAmounts === true,
    )
    expect(call).toBeDefined()
  })

  it.each(
    Object.entries(draftStatusModules),
  )('registers defaultStatus for %s', (moduleKey, status) => {
    const call = mockedRegister.mock.calls.find(
      ([key, config]) => key === moduleKey && config.defaultStatus === status,
    )
    expect(call).toBeDefined()
  })

  it.each(
    approvedStatusModules,
  )('registers auditStatus "已审核" for %s', (moduleKey) => {
    const call = mockedRegister.mock.calls.find(
      ([key, config]) => key === moduleKey && config.auditStatus === '已审核',
    )
    expect(call).toBeDefined()
  })

  it('registers auditStatus for receipt', () => {
    const receiptCalls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'receipt',
    )
    expect(
      receiptCalls.some(([, config]) => config.auditStatus === '已收款'),
    ).toBe(true)
  })

  it('registers auditStatus for payment', () => {
    const paymentCalls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'payment',
    )
    expect(
      paymentCalls.some(([, config]) => config.auditStatus === '已付款'),
    ).toBe(true)
  })

  it('registers auditStatus for invoice-receipt', () => {
    const invoiceReceiptCalls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'invoice-receipt',
    )
    expect(
      invoiceReceiptCalls.some(([, config]) => config.auditStatus === '已收票'),
    ).toBe(true)
  })

  it('registers auditStatus for invoice-issue', () => {
    const invoiceIssueCalls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'invoice-issue',
    )
    expect(
      invoiceIssueCalls.some(([, config]) => config.auditStatus === '已开票'),
    ).toBe(true)
  })

  it('registers auditStatus for ledger-adjustment', () => {
    const adjustmentCalls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'ledger-adjustment',
    )
    expect(
      adjustmentCalls.some(([, config]) => config.auditStatus === '已审核'),
    ).toBe(true)
  })

  it('registers auditStatus for statement confirmation modules', () => {
    for (const moduleKey of ['supplier-statement', 'customer-statement']) {
      const calls = mockedRegister.mock.calls.filter(
        ([key]) => key === moduleKey,
      )
      expect(calls.some(([, config]) => config.auditStatus === '已确认')).toBe(
        true,
      )
    }
  })

  describe('protectedEditStatuses', () => {
    it('is a Set', () => {
      expect(protectedEditStatuses).toBeInstanceOf(Set)
    })

    it('contains expected statuses', () => {
      expect(protectedEditStatuses).toContain('已审核')
      expect(protectedEditStatuses).toContain('已完成')
      expect(protectedEditStatuses).toContain('完成采购')
      expect(protectedEditStatuses).toContain('完成入库')
      expect(protectedEditStatuses).toContain('完成销售')
      expect(protectedEditStatuses).toContain('已确认')
      expect(protectedEditStatuses).toContain('已付款')
      expect(protectedEditStatuses).toContain('已收款')
      expect(protectedEditStatuses).toContain('已签署')
    })

    it('has 9 items', () => {
      expect(protectedEditStatuses.size).toBe(9)
    })
  })

  describe('protectedDeleteStatuses', () => {
    it('is a Set', () => {
      expect(protectedDeleteStatuses).toBeInstanceOf(Set)
    })

    it('contains expected statuses', () => {
      expect(protectedDeleteStatuses).toContain('已审核')
      expect(protectedDeleteStatuses).toContain('已完成')
      expect(protectedDeleteStatuses).toContain('完成采购')
      expect(protectedDeleteStatuses).toContain('完成入库')
      expect(protectedDeleteStatuses).toContain('完成销售')
      expect(protectedDeleteStatuses).toContain('已确认')
      expect(protectedDeleteStatuses).toContain('已付款')
      expect(protectedDeleteStatuses).toContain('已收款')
      expect(protectedDeleteStatuses).toContain('已签署')
    })

    it('has 9 items', () => {
      expect(protectedDeleteStatuses.size).toBe(9)
    })

    it('has same statuses as protectedEditStatuses', () => {
      expect([...protectedDeleteStatuses].sort()).toEqual(
        [...protectedEditStatuses].sort(),
      )
    })
  })
})
