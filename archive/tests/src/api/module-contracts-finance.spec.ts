import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ENDPOINTS } from '@/constants/endpoints'
import { financeModuleEndpointContracts } from './module-contracts-finance'
import {
  exportPurchaseFinanceDocumentFlow,
  getPurchaseFinanceDocumentFlow,
} from './purchase-finance-flow'

const { downloadBlobMock, getMock, postMock } = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    http: { get: getMock, post: postMock },
  }
})

vi.mock('@/utils/download', () => ({ downloadBlob: downloadBlobMock }))

describe('module-contracts-finance', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    downloadBlobMock.mockReset()
  })

  it('exports finance module contracts', () => {
    expect(financeModuleEndpointContracts).toBeDefined()
    expect(typeof financeModuleEndpointContracts).toBe('object')
  })

  it('contains supplier-statement config', () => {
    const config = financeModuleEndpointContracts['supplier-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/supplier-statements')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('supplierName')
    expect(config.nativeFilterKeys).toContain('supplierId')
    expect(config.nativeFilterKeys).toContain('status')
    expect(config.dateRangeMapping?.endDate.startKey).toBe('periodStart')
    expect(config.dateRangeMapping?.endDate.endKey).toBe('periodEnd')
  })

  it('contains customer-statement config', () => {
    const config = financeModuleEndpointContracts['customer-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/customer-statements')
    expect(config.nativeFilterKeys).toContain('customerName')
    expect(config.nativeFilterKeys).toEqual(
      expect.arrayContaining(['customerId', 'projectId']),
    )
  })

  it('contains freight-statement config', () => {
    const config = financeModuleEndpointContracts['freight-statement']
    expect(config).toBeDefined()
    expect(config.path).toBe('/freight-statements')
    expect(config.nativeFilterKeys).toContain('carrierCode')
    expect(config.nativeFilterKeys).toContain('carrierName')
    expect(config.nativeFilterKeys).toContain('carrierId')
    expect(config.nativeFilterKeys).toContain('signStatus')
  })

  it('contains receipt config', () => {
    const config = financeModuleEndpointContracts.receipt
    expect(config).toBeDefined()
    expect(config.path).toBe('/receipts')
    expect(config.dateRangeMapping?.receiptDate.startKey).toBe('startDate')
    expect(config.nativeFilterKeys).toContain('counterpartyType')
  })

  it('contains payment config', () => {
    const config = financeModuleEndpointContracts.payment
    expect(config).toBeDefined()
    expect(config.path).toBe('/payments')
    expect(config.nativeFilterKeys).toContain('businessType')
  })

  it('contains cash-reversal config', () => {
    const config = financeModuleEndpointContracts['cash-reversal']
    expect(config).toBeDefined()
    expect(config.path).toBe('/cash-reversals')
    expect(config.nativeFilterKeys).toEqual(
      expect.arrayContaining(['keyword', 'settlementCompanyId', 'status']),
    )
    expect(config.dateRangeMapping?.reversalDate).toEqual({
      startKey: 'startDate',
      endKey: 'endDate',
    })
  })

  it('contains supplier-refund-receipt config', () => {
    const config = financeModuleEndpointContracts['supplier-refund-receipt']
    expect(config).toBeDefined()
    expect(config.path).toBe('/supplier-refund-receipts')
    expect(config.nativeFilterKeys).toEqual([
      'keyword',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ])
    expect(config.dateRangeMapping?.receiptDate).toEqual({
      startKey: 'startDate',
      endKey: 'endDate',
    })
  })

  it('contains invoice-receipt config', () => {
    const config = financeModuleEndpointContracts['invoice-receipt']
    expect(config).toBeDefined()
    expect(config.path).toBe('/invoice-receipts')
  })

  it('contains invoice-issue config', () => {
    const config = financeModuleEndpointContracts['invoice-issue']
    expect(config).toBeDefined()
    expect(config.path).toBe('/invoice-issues')
    expect(config.nativeFilterKeys).toContain('customerName')
  })

  it('contains ledger-adjustment config', () => {
    const config = financeModuleEndpointContracts['ledger-adjustment']
    expect(config).toBeDefined()
    expect(config.path).toBe('/ledger-adjustments')
    expect(config.nativeFilterKeys).toContain('direction')
    expect(config.nativeFilterKeys).toContain('counterpartyType')
    expect(config.nativeFilterKeys).toContain('settlementCompanyId')
    expect(config.dateRangeMapping?.adjustmentDate.startKey).toBe('startDate')
    expect(config.dateRangeMapping?.adjustmentDate.endKey).toBe('endDate')
  })

  it('contains receivable-payable config as read-only', () => {
    const config = financeModuleEndpointContracts['receivable-payable']
    expect(config).toBeDefined()
    expect(config.path).toBe('/receivable-payables')
    expect(config.readOnly).toBe(true)
    expect(config.supportsDetail).toBe(true)
    expect(config.sortDirectionParam).toBe('sortDirection')
    expect(config.nativeFilterKeys).toContain('reconciliationStatus')
    expect(new Set(config.nativeFilterKeys).size).toBe(
      config.nativeFilterKeys?.length,
    )
  })

  it('normalizes purchase finance flow and forwards paging cancellation', async () => {
    const signal = new AbortController().signal
    getMock.mockResolvedValue({
      code: 0,
      data: {
        summary: {
          purchasePlanAmount: '40000.00',
          expenseAmount: '32000.00',
          incomeAmount: '7200.00',
          historicalAdjustmentAmount: '-120.00',
        },
        items: {
          content: [
            {
              flowSequence: 1,
              documentType: '采购订单',
              documentId: '308251467645452280',
              documentNo: 'PO001',
              lineNo: 1,
              quantity: 10,
              lineAmount: '40000.00',
              adjustmentDirection: '应付',
              adjustmentEffect: '减少余额',
              effective: true,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
          hasMore: false,
        },
      },
    })

    const result = await getPurchaseFinanceDocumentFlow(
      {
        settlementCompanyId: '308251467645452281',
        supplierId: '308251467645452282',
        documentType: ' 采购订单 ',
        status: '完成采购',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        materialKeyword: ' 螺纹钢 ',
        purchaseOrderId: '308251467645452280',
        page: 0,
        size: 20,
      },
      signal,
    )

    expect(getMock).toHaveBeenCalledWith(
      ENDPOINTS.PURCHASE_FINANCE_DOCUMENT_FLOW,
      {
        params: {
          settlementCompanyId: '308251467645452281',
          supplierId: '308251467645452282',
          documentType: '采购订单',
          status: '完成采购',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          materialKeyword: '螺纹钢',
          purchaseOrderId: '308251467645452280',
          page: 0,
          size: 20,
        },
        signal,
      },
    )
    expect(result.summary).toMatchObject({
      purchasePlanAmount: 40000,
      expenseAmount: 32000,
      incomeAmount: 7200,
      historicalAdjustmentAmount: -120,
    })
    expect(result.items.content[0]).toMatchObject({
      key: '采购订单-308251467645452280-1',
      documentNo: 'PO001',
      lineAmount: 40000,
      adjustmentDirection: '应付',
      adjustmentEffect: '减少余额',
      effective: true,
    })
    expect(result.items.totalElements).toBe(1)
  })

  it('exports purchase finance flow with the normalized current filters', async () => {
    const blob = new Blob(['xlsx'])
    postMock.mockResolvedValue(blob)

    await exportPurchaseFinanceDocumentFlow({
      settlementCompanyId: '308251467645452281',
      supplierId: '308251467645452282',
      documentType: ' 采购付款单 ',
      materialKeyword: ' ',
      purchaseOrderId: '308251467645452280',
    })

    expect(postMock).toHaveBeenCalledWith(
      ENDPOINTS.PURCHASE_FINANCE_DOCUMENT_FLOW_EXPORT,
      {
        settlementCompanyId: '308251467645452281',
        supplierId: '308251467645452282',
        documentType: '采购付款单',
        purchaseOrderId: '308251467645452280',
      },
      { responseType: 'blob' },
    )
    expect(downloadBlobMock).toHaveBeenCalledWith(blob, '采购财务单据流.xlsx')
  })
})
