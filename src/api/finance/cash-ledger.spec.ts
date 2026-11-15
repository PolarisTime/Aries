import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
}))

import { getCashLedger } from '@/api/finance/cash-ledger'
import { ENDPOINTS } from '@/constants/endpoints'

const SUMMARY = {
  openingBalance: 100,
  periodIncome: 40,
  periodExpense: 10,
  closingBalance: 130,
}

const PAGE = {
  content: [
    {
      businessDate: '2026-01-01',
      flowType: 'RECEIPT',
      documentId: '700000000000000001',
      documentNo: 'SK-1',
      counterpartyType: '客户',
      counterpartyName: '客户A',
      incomeAmount: 40,
      expenseAmount: 0,
      runningBalance: 140,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 20,
  hasMore: false,
}

describe('getCashLedger 标准分页契约', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('分别请求列表 PageResponse 与独立 summary 端点', async () => {
    apiGetMock.mockResolvedValueOnce(PAGE).mockResolvedValueOnce(SUMMARY)

    const result = await getCashLedger({
      settlementCompanyId: '42',
      page: 0,
      size: 20,
    })

    expect(apiGetMock).toHaveBeenNthCalledWith(
      1,
      ENDPOINTS.CASH_LEDGER,
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({
          settlementCompanyId: '42',
          page: 0,
          size: 20,
        }),
      }),
    )
    expect(apiGetMock).toHaveBeenNthCalledWith(
      2,
      ENDPOINTS.CASH_LEDGER_SUMMARY,
      expect.anything(),
      expect.objectContaining({
        params: { settlementCompanyId: '42' },
      }),
    )
    expect(result.summary.openingBalance).toBe(100)
    expect(result.page.totalElements).toBe(1)
    expect(result.page.content[0]?.documentNo).toBe('SK-1')
  })
})
