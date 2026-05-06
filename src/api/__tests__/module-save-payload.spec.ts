import { describe, expect, it, vi, afterEach } from 'vitest'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'

describe('module-save-payload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps sales-order status in payload and ignores computed totals in save warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const payload = serializeBusinessRecordForSave('sales-orders', {
      id: '1',
      customerName: '客户甲',
      orderNo: 'SO-001',
      purchaseOrderNo: 'PO-001',
      salesName: '销售A',
      projectName: '项目A',
      deliveryDate: '2026-05-06',
      status: '草稿',
      remark: '备注',
      totalWeight: 3.181,
      totalAmount: 12600,
      items: [],
    })

    expect(payload).toEqual(expect.objectContaining({
      customerName: '客户甲',
      orderNo: 'SO-001',
      purchaseOrderNo: 'PO-001',
      salesName: '销售A',
      projectName: '项目A',
      deliveryDate: '2026-05-06',
      status: '草稿',
      remark: '备注',
      items: [],
    }))
    expect(payload).not.toHaveProperty('totalWeight')
    expect(payload).not.toHaveProperty('totalAmount')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('keeps statement settlement fields in payload for customer and supplier statements', () => {
    const customerPayload = serializeBusinessRecordForSave('customer-statements', {
      id: '1',
      statementNo: 'KHDZ-001',
      sourceOrderNos: 'SO-001',
      customerName: '客户甲',
      projectName: '项目A',
      startDate: '2026-05-01',
      endDate: '2026-05-06',
      salesAmount: 3200,
      receiptAmount: 3200,
      closingAmount: 0,
      status: '待确认',
      remark: '备注',
      items: [],
    })
    const supplierPayload = serializeBusinessRecordForSave('supplier-statements', {
      id: '2',
      statementNo: 'GYDZ-001',
      sourceInboundNos: 'IN-001',
      supplierName: '供应商甲',
      startDate: '2026-05-01',
      endDate: '2026-05-06',
      purchaseAmount: 2800,
      paymentAmount: 0,
      closingAmount: 2800,
      status: '待确认',
      remark: '备注',
      items: [],
    })

    expect(customerPayload).toEqual(expect.objectContaining({
      statementNo: 'KHDZ-001',
      sourceOrderNos: 'SO-001',
      customerName: '客户甲',
      projectName: '项目A',
      startDate: '2026-05-01',
      endDate: '2026-05-06',
      salesAmount: 3200,
      receiptAmount: 3200,
      closingAmount: 0,
      status: '待确认',
      remark: '备注',
      items: [],
    }))
    expect(supplierPayload).toEqual(expect.objectContaining({
      statementNo: 'GYDZ-001',
      sourceInboundNos: 'IN-001',
      supplierName: '供应商甲',
      startDate: '2026-05-01',
      endDate: '2026-05-06',
      purchaseAmount: 2800,
      paymentAmount: 0,
      closingAmount: 2800,
      status: '待确认',
      remark: '备注',
      items: [],
    }))
  })

  it('serializes finance allocation items with numeric allocatedAmount', () => {
    const payload = serializeBusinessRecordForSave('receipts', {
      id: '1',
      receiptNo: 'SK-001',
      customerName: '客户甲',
      projectName: '项目A',
      receiptDate: '2026-05-07',
      payType: '银行转账',
      amount: 1000,
      status: '草稿',
      operatorName: '财务A',
      remark: '备注',
      items: [
        {
          id: '101',
          sourceStatementId: 201,
          allocatedAmount: '320.55',
          statementNo: 'KHDZ-001',
        },
      ],
    })

    expect(payload).toEqual(expect.objectContaining({
      receiptNo: 'SK-001',
      customerName: '客户甲',
      projectName: '项目A',
      amount: 1000,
      items: [
        {
          id: '101',
          sourceStatementId: 201,
          allocatedAmount: 320.55,
        },
      ],
    }))
  })
})
