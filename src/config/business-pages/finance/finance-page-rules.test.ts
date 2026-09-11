import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCarrierEntityOptions: vi.fn(() => [{ label: 'carrier', value: 'c1' }]),
  getSupplierEntityOptions: vi.fn(() => [{ label: 'supplier', value: 's1' }]),
  getCustomerOptions: vi.fn(() => [{ label: 'customer', value: 'cu1' }]),
}))

vi.mock('@/queries/master/carrier-options', () => ({
  getCarrierEntityOptions: mocks.getCarrierEntityOptions,
}))

vi.mock('@/queries/master/supplier-options', () => ({
  getSupplierEntityOptions: mocks.getSupplierEntityOptions,
}))

vi.mock('@/module-system/core/module-option-resolvers', () => ({
  getCustomerOptions: mocks.getCustomerOptions,
}))

import {
  buildPaymentOverview,
  buildReceiptOverview,
  getPaymentCounterpartyOptions,
  getReceiptCounterpartyOptions,
} from './finance-page-rules'

describe('finance-page-rules', () => {
  beforeEach(() => {
    mocks.getCarrierEntityOptions.mockClear()
    mocks.getSupplierEntityOptions.mockClear()
    mocks.getCustomerOptions.mockClear()
  })

  describe('getPaymentCounterpartyOptions', () => {
    it('默认返回供应商选项', () => {
      expect(getPaymentCounterpartyOptions()).toEqual([
        { label: 'supplier', value: 's1' },
      ])
      expect(getPaymentCounterpartyOptions({})).toEqual([
        { label: 'supplier', value: 's1' },
      ])
      expect(
        getPaymentCounterpartyOptions({ counterpartyType: '供应商' }),
      ).toEqual([{ label: 'supplier', value: 's1' }])
    })

    it('物流商类型返回物流商选项', () => {
      expect(
        getPaymentCounterpartyOptions({ counterpartyType: '物流商' }),
      ).toEqual([{ label: 'carrier', value: 'c1' }])
    })
  })

  describe('getReceiptCounterpartyOptions', () => {
    it('默认返回客户选项', () => {
      expect(getReceiptCounterpartyOptions()).toEqual([
        { label: 'customer', value: 'cu1' },
      ])
      expect(
        getReceiptCounterpartyOptions({ counterpartyType: '客户' }),
      ).toEqual([{ label: 'customer', value: 'cu1' }])
    })

    it('供应商类型返回供应商选项', () => {
      expect(
        getReceiptCounterpartyOptions({ counterpartyType: '供应商' }),
      ).toEqual([{ label: 'supplier', value: 's1' }])
    })
  })

  describe('overview builders', () => {
    it('空行集合返回零值概览', () => {
      expect(buildPaymentOverview([])).toHaveLength(2)
      expect(buildReceiptOverview([])).toHaveLength(2)
    })

    it('汇总金额字段', () => {
      const rows = [{ amount: 100.5 }, { amount: 200 }, {}] as never
      expect(buildPaymentOverview(rows)[1].value).toBe('300.50')
    })
  })
})
