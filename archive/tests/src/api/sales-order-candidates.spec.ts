import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import {
  listSalesOrderFreightImportCandidatePage,
  listSalesOrderPurchaseSourceCandidatePage,
} from './sales-order-candidates'

describe('sales-order-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  it('lists sales order freight import candidates', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [
          {
            id: '321698660075175936',
            orderNo: 'SO2026000001',
            status: '已审核',
          },
        ],
        totalElements: 1,
      },
    })

    const result = await listSalesOrderFreightImportCandidatePage(
      {
        keyword: ' SO2026000001 ',
        customerName: '客户甲',
        currentRecordId: '700520000000000099',
      },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/sales-orders/freight-import-candidates',
      {
        params: {
          keyword: 'SO2026000001',
          customerName: '客户甲',
          currentFreightBillId: '700520000000000099',
          page: 0,
          size: 15,
        },
      },
    )
    expect(result.data?.total).toBe(1)
    expect(result.data?.rows?.[0]).toEqual(
      expect.objectContaining({
        id: '321698660075175936',
        orderNo: 'SO2026000001',
      }),
    )
  })

  it('lists authoritative normal sales purchase sources', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [{ id: '11', orderNo: 'PO-1', salesMode: 'NORMAL' }],
        totalElements: 1,
      },
    })

    await listSalesOrderPurchaseSourceCandidatePage(
      {
        keyword: ' PO-1 ',
        salesMode: 'NORMAL',
        currentSalesOrderId: '99',
      },
      1,
      20,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/sales-orders/source-candidates',
      {
        params: {
          keyword: 'PO-1',
          salesMode: 'NORMAL',
          currentSalesOrderId: '99',
          page: 1,
          size: 20,
        },
      },
    )
  })
})
