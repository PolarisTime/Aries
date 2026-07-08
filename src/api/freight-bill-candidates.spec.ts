import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import { listFreightBillImportCandidatePage } from './freight-bill-candidates'

describe('freight-bill-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  it('lists freight bill import candidates', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [
          {
            id: '321698660075175936',
            outboundNo: 'OB2026000001',
            status: '预出库',
          },
        ],
        totalElements: 1,
      },
    })

    const result = await listFreightBillImportCandidatePage(
      { keyword: ' OB2026000001 ', customerName: '客户甲' },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/freight-bills/import-candidates',
      {
        params: {
          keyword: 'OB2026000001',
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
        outboundNo: 'OB2026000001',
        status: '预出库',
      }),
    )
  })
})
