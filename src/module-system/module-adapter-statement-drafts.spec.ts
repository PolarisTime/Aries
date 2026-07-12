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
  const baseDraft = { id: '', supplierId: '', supplierName: '' }
  const sourceInbounds = [
    {
      id: '1',
      inboundNo: 'RK001',
      inboundDate: '2026-01-15',
      supplierId: '700520000000000001',
      supplierCode: 'SUP-001',
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
      supplierId: '700520000000000001',
      supplierCode: 'SUP-001',
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
    expect(result.supplierId).toBe('700520000000000001')
    expect(result.supplierCode).toBe('SUP-001')
    expect(result.startDate).toBe('2026-01-15')
    expect(result.endDate).toBe('2026-02-20')
    expect(result.purchaseAmount).toBe(3000)
    expect(result.paymentAmount).toBe(0)
    expect(result.closingAmount).toBe(3000)
    expect(result.sourceInboundNos).toBe('RK001, RK002')
    expect(result.items).toHaveLength(3)
    expect(result.remark).toContain('RK001')
  })

  it('rejects source inbounds from different stable supplier ids', () => {
    expect(() =>
      buildSupplierStatementDraftData({
        baseDraft,
        sourceInbounds: [
          sourceInbounds[0],
          {
            ...sourceInbounds[1],
            supplierId: '700520000000000002',
            supplierName: '供应商A',
          },
        ],
        payments: [],
        today: '2026-03-01',
        statementPeriod: undefined,
        defaultFullPayment: false,
        cloneLineItems,
        buildLineItemId,
      }),
    ).toThrow('supplierId')
  })

  it('uses payment records when default full payment is disabled', () => {
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds,
      payments: [{ id: 'PAY-1', amount: 1200.456 }] as any[],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.paymentAmount).toBe(1200.46)
    expect(result.closingAmount).toBe(1799.54)
  })

  it('defaults to full payment when default full payment is enabled', () => {
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds,
      payments: [{ id: 'PAY-1', amount: 1200 }] as any[],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: true,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.paymentAmount).toBe(3000)
    expect(result.closingAmount).toBe(0)
  })

  it('caps payment amount at purchase amount', () => {
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds,
      payments: [{ id: 'PAY-1', amount: 5000 }] as any[],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.paymentAmount).toBe(3000)
    expect(result.closingAmount).toBe(0)
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
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
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

  it('ignores blank inbound numbers and normalizes invalid amounts', () => {
    const inbounds = [
      {
        id: '1',
        inboundNo: '',
        inboundDate: '2026-01-15',
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '',
        totalAmount: 'invalid',
        items: [
          { id: 'item-1', materialCode: 'M001' },
          { id: 'item-2', materialCode: 'M002', amount: 200 },
        ],
      },
    ] as any[]
    const result = buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: inbounds,
      payments: [{ id: 'PAY-1', amount: 'invalid' }] as any[],
      today: '2026-03-01',
      statementPeriod: undefined,
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.supplierName).toBe('')
    expect(result.sourceInboundNos).toBe('')
    expect(result.purchaseAmount).toBe(200)
    expect(result.paymentAmount).toBe(0)
    expect(result.items[0]).toMatchObject({ sourceNo: '' })
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
    expect(result.receiptAmount).toBe(3000)
    expect(result.closingAmount).toBe(0)
    expect(result.items).toHaveLength(1)
    expect(result.sourceOrderNos).toBe('XS001')
  })

  it('keeps receipt amount zero when configured', () => {
    const result = buildCustomerStatementDraftData({
      baseDraft,
      sourceOrders,
      today: '2026-03-15',
      statementPeriod: undefined,
      defaultReceiptAmountZero: true,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.receiptAmount).toBe(0)
    expect(result.closingAmount).toBe(3000)
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

  it('sorts multiple orders and skips blank order numbers', () => {
    const orders = [
      {
        id: '2',
        orderNo: 'XS002',
        deliveryDate: '2026-03-20',
        orderDate: '2026-03-02',
        customerName: '客户B',
        projectName: '项目Y',
        totalAmount: 2000,
        items: [{ id: 'item-2', amount: 2000 }],
      },
      {
        id: '1',
        orderNo: '',
        deliveryDate: '2026-03-10',
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
      today: '2026-03-25',
      statementPeriod: undefined,
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.customerName).toBe('客户A')
    expect(result.startDate).toBe('2026-03-10')
    expect(result.endDate).toBe('2026-03-20')
    expect(result.sourceOrderNos).toBe('XS002')
    expect(result.items[0]).toMatchObject({
      sourceNo: '',
      sourceSalesOrderItemId: 'item-1',
    })
  })

  it('keeps stable customer and project identities across draft and lines', () => {
    const result = buildCustomerStatementDraftData({
      baseDraft,
      sourceOrders: [
        {
          id: '700520000000000011',
          orderNo: 'XS011',
          deliveryDate: '2026-03-10',
          customerId: '700520000000000001',
          customerCode: 'CUS-001',
          customerName: '客户新名称',
          projectId: '700520000000000002',
          projectName: '项目新名称',
          totalAmount: 3000,
          items: [
            {
              id: '700520000000000101',
              customerId: '700520000000000001',
              projectId: '700520000000000002',
              amount: 3000,
            },
          ],
        },
      ] as any[],
      today: '2026-03-15',
      statementPeriod: undefined,
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result).toMatchObject({
      customerId: '700520000000000001',
      customerCode: 'CUS-001',
      customerName: '客户新名称',
      projectId: '700520000000000002',
      projectName: '项目新名称',
    })
    expect(result.items[0]).toMatchObject({
      sourceSalesOrderItemId: '700520000000000101',
      customerId: '700520000000000001',
      projectId: '700520000000000002',
    })
  })

  it('rejects same-name source orders with different customer ids', () => {
    expect(() =>
      buildCustomerStatementDraftData({
        baseDraft,
        sourceOrders: [
          {
            ...sourceOrders[0],
            customerId: '700520000000000001',
            projectId: '700520000000000010',
          },
          {
            ...sourceOrders[0],
            id: '2',
            customerId: '700520000000000002',
            projectId: '700520000000000010',
          },
        ],
        today: '2026-03-15',
        statementPeriod: undefined,
        defaultReceiptAmountZero: false,
        cloneLineItems,
        buildLineItemId,
      }),
    ).toThrow('customerId')
  })

  it('rejects partially missing stable project identities', () => {
    expect(() =>
      buildCustomerStatementDraftData({
        baseDraft,
        sourceOrders: [
          {
            ...sourceOrders[0],
            customerId: '700520000000000001',
            projectId: '700520000000000010',
          },
          {
            ...sourceOrders[0],
            id: '2',
            customerId: '700520000000000001',
            projectId: undefined,
          },
        ],
        today: '2026-03-15',
        statementPeriod: undefined,
        defaultReceiptAmountZero: false,
        cloneLineItems,
        buildLineItemId,
      }),
    ).toThrow('projectId')
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

  it('skips blank bill numbers and defaults missing freight amounts', () => {
    const bills = [
      {
        id: '1',
        billNo: '',
        billTime: '2026-04-01',
        carrierName: '物流商A',
        items: [{ id: 'item-1', amount: 0 }],
      },
      {
        id: '2',
        billNo: 'W002',
        billTime: '2026-04-02',
        carrierName: '物流商A',
        totalWeight: 30,
        totalFreight: 300,
        items: [{ id: 'item-2', weightTon: 30, amount: 300 }],
      },
    ] as any[]
    const result = buildFreightStatementDraftData({
      baseDraft,
      sourceBills: bills,
      today: '2026-04-10',
      statementPeriod: undefined,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result.sourceBillNos).toBe('W002')
    expect(result.totalWeight).toBe(30)
    expect(result.totalFreight).toBe(300)
    expect(result.items[0]).toMatchObject({ sourceNo: '' })
  })

  it('keeps carrier and direct freight source identities', () => {
    const result = buildFreightStatementDraftData({
      baseDraft,
      sourceBills: [
        {
          id: '701000000000000001',
          billNo: 'W001',
          billTime: '2026-04-01',
          carrierId: '701000000000000010',
          carrierCode: 'WL-001',
          carrierName: '物流商新名称',
          customerId: '701000000000000020',
          projectId: '701000000000000021',
          totalWeight: 50,
          totalFreight: 500,
          items: [
            {
              id: '701000000000000002',
              customerId: '701000000000000020',
              projectId: '701000000000000021',
              weightTon: 50,
            },
          ],
        },
      ] as any[],
      today: '2026-04-10',
      statementPeriod: undefined,
      cloneLineItems,
      buildLineItemId,
    })

    expect(result).toMatchObject({
      carrierId: '701000000000000010',
      carrierCode: 'WL-001',
      carrierName: '物流商新名称',
    })
    expect(result.items[0]).toMatchObject({
      sourceFreightBillId: '701000000000000001',
      sourceFreightBillItemId: '701000000000000002',
      customerId: '701000000000000020',
      projectId: '701000000000000021',
    })
  })

  it('rejects same-name source bills with different carrier ids', () => {
    expect(() =>
      buildFreightStatementDraftData({
        baseDraft,
        sourceBills: [
          { ...sourceBills[0], carrierId: '701000000000000010' },
          {
            ...sourceBills[0],
            id: '2',
            carrierId: '701000000000000011',
          },
        ],
        today: '2026-04-10',
        statementPeriod: undefined,
        cloneLineItems,
        buildLineItemId,
      }),
    ).toThrow('carrierId')
  })
})
