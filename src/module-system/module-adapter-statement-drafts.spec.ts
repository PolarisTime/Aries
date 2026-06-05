import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import {
  buildCustomerStatementDraftData,
  buildFreightStatementDraftData,
  buildSupplierStatementDraftData,
} from './module-adapter-statement-drafts'

const cloneLineItems = (value: unknown) =>
  structuredClone(value) as ModuleLineItem[]
let itemCounter = 0
const buildLineItemId = () => `item-${++itemCounter}`

describe('buildSupplierStatementDraftData', () => {
  const baseDraft = { id: '', supplierName: '' }
  const sourceInbounds = [
    {
      id: '1',
      inboundNo: 'RK001',
      inboundDate: '2026-01-15',
      supplierName: '供应商A',
      totalAmount: 1000,
      items: [
        {
          id: 'item-1',
          materialCode: 'M001',
          amount: 500,
          weightTon: 10,
        },
        {
          id: 'item-2',
          materialCode: 'M002',
          amount: 500,
          weightTon: 10,
        },
      ],
    },
    {
      id: '2',
      inboundNo: 'RK002',
      inboundDate: '2026-02-20',
      supplierName: '供应商A',
      totalAmount: 2000,
      items: [
        {
          id: 'item-3',
          materialCode: 'M003',
          amount: 2000,
          weightTon: 20,
        },
      ],
    },
  ] as any[]

  it('builds draft with sorted inbounds and correct amounts', () => {
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds,
      payments: [],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.supplierName).toBe('供应商A')
    expect(result.startDate).toBe('2026-01-15')
    expect(result.endDate).toBe('2026-02-20')
    expect(result.purchaseAmount).toBe(3000)
    expect(result.paymentAmount).toBe(0)
    expect(result.closingAmount).toBe(3000)
    expect(result.sourceInboundNos).toBe('RK001, RK002')
    expect(result.items).toHaveLength(3)
    expect(result.remark).toContain('RK001')
  })

  it('handles single inbound', () => {
    const single = [sourceInbounds[0]]
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: single,
      payments: [],
      today: '2026-03-01',
      statementPeriod: { startDate: '2026-01-01', endDate: '2026-01-31' },
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.startDate).toBe('2026-01-01')
    expect(result.endDate).toBe('2026-01-31')
    expect(result.supplierName).toBe('供应商A')
    expect(result.items).toHaveLength(2)
  })

  it('handles empty source inbounds', () => {
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: [],
      payments: [],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.supplierName).toBe('')
    expect(result.sourceInboundNos).toBe('')
    expect(result.items).toHaveLength(0)
  })

  it('falls back to summing line items when totalAmount is not finite', () => {
    const inbounds = [
      {
        id: '1',
        inboundNo: 'RK001',
        inboundDate: '2026-01-15',
        supplierName: '供应商A',
        totalAmount: 'invalid',
        items: [
          { id: 'item-1', materialCode: 'M001', amount: 300 },
          { id: 'item-2', materialCode: 'M002', amount: 700 },
        ],
      },
    ] as any[]
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: inbounds,
      payments: [],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.purchaseAmount).toBe(1000)
  })
})

describe('buildCustomerStatementDraftData', () => {
  const baseDraft = { id: '', customerName: '' }
  const sourceOrders = [
    {
      id: '1',
      orderNo: 'XS001',
      deliveryDate: '2026-03-10',
      orderDate: '2026-03-01',
      customerName: '客户A',
      projectName: '项目X',
      totalAmount: 3000,
      items: [{ id: 'item-1', amount: 3000, weightTon: 30 }],
    },
  ] as any[]

  it('builds draft with sorted orders', () => {
    const result = buildCustomerStatementDraftData({
      baseDraft,
      sourceOrders,
      today: '2026-03-15',
      statementPeriod: undefined,
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.customerName).toBe('客户A')
    expect(result.projectName).toBe('项目X')
    expect(result.salesAmount).toBe(3000)
    expect(result.receiptAmount).toBe(0)
    expect(result.items).toHaveLength(1)
    expect(result.sourceOrderNos).toBe('XS001')
  })

  it('handles empty source orders', () => {
    const result = buildCustomerStatementDraftData({
      baseDraft,
      sourceOrders: [],
      today: '2026-03-15',
      statementPeriod: undefined,
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.customerName).toBe('')
    expect(result.projectName).toBe('')
    expect(result.items).toHaveLength(0)
    expect(result.salesAmount).toBe(0)
  })

  it('falls back to orderDate when deliveryDate is missing', () => {
    const orders = [
      {
        id: '1',
        orderNo: 'XS001',
        orderDate: '2026-03-01',
        customerName: '客户A',
        projectName: '项目X',
        totalAmount: 1000,
        items: [{ id: 'item-1', amount: 1000 }],
      },
    ] as any[]
    const result = buildCustomerStatementDraftData({
      baseDraft,
      sourceOrders: orders,
      today: '2026-03-15',
      statementPeriod: undefined,
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.startDate).toBe('2026-03-01')
  })
})

describe('buildFreightStatementDraftData', () => {
  const baseDraft = { id: '', carrierName: '' }
  const sourceBills = [
    {
      id: '1',
      billNo: 'W001',
      billTime: '2026-04-01',
      carrierName: '物流商A',
      totalWeight: 50,
      totalFreight: 500,
      items: [{ id: 'item-1', weightTon: 50, amount: 500 }],
    },
  ] as any[]

  it('builds draft with bill data', () => {
    const result = buildFreightStatementDraftData({
      baseDraft,
      sourceBills,
      today: '2026-04-10',
      statementPeriod: undefined,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.carrierName).toBe('物流商A')
    expect(result.totalWeight).toBe(50)
    expect(result.totalFreight).toBe(500)
    expect(result.paidAmount).toBe(0)
    expect(result.unpaidAmount).toBe(500)
    expect(result.status).toBe('待审核')
    expect(result.signStatus).toBe('未签署')
    expect(result.sourceBillNos).toBe('W001')
    expect(result.items).toHaveLength(1)
  })

  it('handles empty source bills', () => {
    const result = buildFreightStatementDraftData({
      baseDraft,
      sourceBills: [],
      today: '2026-04-10',
      statementPeriod: undefined,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.carrierName).toBe('')
    expect(result.totalWeight).toBe(0)
    expect(result.totalFreight).toBe(0)
    expect(result.items).toHaveLength(0)
  })

  it('builds draft with multiple bills sorted by billTime', () => {
    const multipleBills = [
      {
        id: '2',
        billNo: 'W002',
        billTime: '2026-04-15',
        carrierName: '物流商A',
        totalWeight: 30,
        totalFreight: 300,
        items: [{ id: 'item-2', weightTon: 30, amount: 300 }],
      },
      {
        id: '1',
        billNo: 'W001',
        billTime: '2026-04-01',
        carrierName: '物流商A',
        totalWeight: 50,
        totalFreight: 500,
        items: [{ id: 'item-1', weightTon: 50, amount: 500 }],
      },
    ] as any[]
    const result = buildFreightStatementDraftData({
      baseDraft,
      sourceBills: multipleBills,
      today: '2026-04-20',
      statementPeriod: undefined,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.totalWeight).toBe(80)
    expect(result.totalFreight).toBe(800)
    expect(result.sourceBillNos).toBe('W001, W002')
    expect(result.items).toHaveLength(2)
  })
})
