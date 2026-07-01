import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import { listSalesOrderOutboundImportCandidatePage } from './sales-order-candidates'

describe('sales-order-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  it('lists sales order outbound import candidates', async () => {
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

    const result = await listSalesOrderOutboundImportCandidatePage(
      { keyword: ' SO2026000001 ', customerName: '客户甲' },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/sales-orders/outbound-import-candidate',
      {
        params: {
          keyword: 'SO2026000001',
          customerName: '客户甲',
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
})
