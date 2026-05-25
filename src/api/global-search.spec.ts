import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/api/client'
import { searchGlobalDocuments } from '@/api/global-search'
import { ENDPOINTS } from '@/constants/endpoints'

vi.mock('@/api/client', () => ({
  assertApiSuccess: <T extends { code?: number }>(response: T) => response,
  http: {
    get: vi.fn(),
  },
}))

describe('searchGlobalDocuments', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('maps aggregate search results to stable option values with string track ids', async () => {
    vi.mocked(http.get).mockResolvedValue({
      code: 0,
      data: [
        {
          moduleKey: 'purchase-order',
          title: '采购订单',
          trackId: '308251467645452288',
          primaryNo: 'PO2026000032',
          summary: '测试供应商',
          matchedByTrackId: false,
        },
      ],
    })

    const results = await searchGlobalDocuments('PO2026000032', [
      'purchase-order',
    ])

    expect(http.get).toHaveBeenCalledWith(ENDPOINTS.GLOBAL_SEARCH, {
      signal: undefined,
      params: {
        keyword: 'PO2026000032',
        limit: 20,
        moduleKeys: 'purchase-order',
      },
    })
    expect(results).toEqual([
      {
        value: 'purchase-order::308251467645452288',
        label: '采购订单 | PO2026000032 | 测试供应商',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '308251467645452288',
        primaryNo: 'PO2026000032',
        summary: '测试供应商',
        matchedByTrackId: false,
      },
    ])
  })
})
