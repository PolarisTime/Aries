import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import { listPurchaseOrderImportCandidatePage } from './purchase-order-candidates'

describe('purchase-order-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
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
      'purchase-inbound',
      { keyword: ' 321698660075175936 ' },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/purchase-orders/import-candidates',
      {
        params: {
          keyword: '321698660075175936',
          usage: 'purchase-inbound',
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
})
