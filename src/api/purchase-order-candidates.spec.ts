import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import * as purchaseOrderCandidates from './purchase-order-candidates'
import {
  getPurchaseRefundPreview,
  listPurchaseOrderImportCandidatePage,
  listPurchaseRefundSourceCandidatePage,
} from './purchase-order-candidates'

describe('purchase-order-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  it('exposes purchase refund source candidate and preview queries', () => {
    expect(
      (purchaseOrderCandidates as Record<string, unknown>)
        .listPurchaseOrderPrepaymentCandidatePage,
    ).toBeTypeOf('function')
    expect(
      (purchaseOrderCandidates as Record<string, unknown>)
        .listPurchaseRefundSourceCandidatePage,
    ).toBeTypeOf('function')
    expect(
      (purchaseOrderCandidates as Record<string, unknown>)
        .getPurchaseRefundPreview,
    ).toBeTypeOf('function')
  })

  it('lists purchase prepayment candidates from the dedicated server page', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [
          {
            id: '321698660075175936',
            orderNo: 'PO-001',
            status: '完成采购',
            totalAmount: 67890.12,
          },
        ],
        totalElements: 1,
      },
    })
    const listCandidates = (
      purchaseOrderCandidates as typeof purchaseOrderCandidates & {
        listPurchaseOrderPrepaymentCandidatePage?: (
          filters: Record<string, unknown>,
          page: number,
          size: number,
        ) => ReturnType<
          typeof purchaseOrderCandidates.listPurchaseOrderImportCandidatePage
        >
      }
    ).listPurchaseOrderPrepaymentCandidatePage

    expect(listCandidates).toBeTypeOf('function')
    const result = await listCandidates?.(
      { keyword: ' PO-001 ', supplierName: '供应商甲' },
      1,
      20,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/purchase-orders/prepayment-candidates',
      {
        params: {
          keyword: 'PO-001',
          supplierName: '供应商甲',
          page: 1,
          size: 20,
        },
      },
    )
    expect(result?.data?.total).toBe(1)
    expect(result?.data?.rows?.[0]).toEqual(
      expect.objectContaining({
        id: '321698660075175936',
        status: '完成采购',
        totalAmount: 67890.12,
      }),
    )
  })

  it('lists purchase order import candidates with usage', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [
          {
            id: '321698660075175936',
            orderNo: '321698660075175936',
            status: '已审核',
            totalWeight: 12.345,
            totalAmount: 67890.12,
            importableQuantity: 60,
          },
        ],
        totalElements: 1,
      },
    })

    const result = await listPurchaseOrderImportCandidatePage(
      'purchase-contract',
      {
        keyword: ' 321698660075175936 ',
        currentRecordId: '700520000000000099',
      },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/purchase-orders/import-candidates',
      {
        params: {
          keyword: '321698660075175936',
          currentRecordId: '700520000000000099',
          usage: 'purchase-contract',
          page: 0,
          size: 15,
        },
      },
    )
    expect(result.data?.total).toBe(1)
    expect(result.data?.rows?.[0]).toEqual(
      expect.objectContaining({
        id: '321698660075175936',
        totalWeight: 12.345,
        totalAmount: 67890.12,
        importableQuantity: 60,
      }),
    )
  })

  it('lists refundable purchase order candidates', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [
          {
            id: '101',
            orderNo: 'PO-001',
            supplierName: '供应商甲',
            refundableQuantity: 3,
            refundableWeight: 5.5,
            refundableAmount: 1200,
          },
        ],
        totalElements: 1,
      },
    })

    await expect(
      listPurchaseRefundSourceCandidatePage(
        { keyword: ' PO-001 ', supplierName: '供应商甲' },
        1,
        20,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          total: 1,
          rows: [
            expect.objectContaining({
              id: '101',
              orderNo: 'PO-001',
              purchaseOrderNo: 'PO-001',
              refundableAmount: 1200,
            }),
          ],
        }),
      }),
    )
    expect(httpGetMock).toHaveBeenCalledWith(
      '/purchase-refunds/source-candidates',
      {
        params: {
          keyword: 'PO-001',
          supplierName: '供应商甲',
          page: 1,
          size: 20,
        },
      },
    )
  })

  it('loads the authoritative purchase refund preview', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        sourcePurchaseOrderId: '101',
        purchaseOrderNo: 'PO-001',
        supplierCode: 'SUP-001',
        items: [{ id: '501', sourcePurchaseOrderItemId: '11' }],
      },
    })

    await expect(getPurchaseRefundPreview('101')).resolves.toEqual(
      expect.objectContaining({
        id: '101',
        sourcePurchaseOrderId: '101',
        purchaseOrderNo: 'PO-001',
        supplierCode: 'SUP-001',
        items: [
          expect.objectContaining({
            id: '501',
            sourcePurchaseOrderItemId: '11',
          }),
        ],
      }),
    )
    expect(httpGetMock).toHaveBeenCalledWith('/purchase-refunds/preview', {
      params: { sourcePurchaseOrderId: '101' },
    })
  })
})
