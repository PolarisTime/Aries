import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

import {
  listInvoiceIssueSourceCandidatePage,
  listInvoiceReceiptSourceCandidatePage,
} from './invoice-candidates'

describe('invoice-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
    httpGetMock.mockResolvedValue({
      code: 0,
      data: {
        content: [{ id: '101', orderNo: 'SO-001', items: [] }],
        totalElements: 1,
      },
    })
  })

  it('lists invoice issue source candidates with the current issue id', async () => {
    const result = await listInvoiceIssueSourceCandidatePage(
      { keyword: ' SO-001 ', currentRecordId: '9001' },
      0,
      15,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/invoice-issues/source-candidates',
      {
        params: {
          keyword: 'SO-001',
          currentRecordId: '9001',
          page: 0,
          size: 15,
        },
      },
    )
    expect(result.data).toEqual(
      expect.objectContaining({ total: 1, rows: [expect.any(Object)] }),
    )
  })

  it('lists invoice receipt source candidates with the current receipt id', async () => {
    await listInvoiceReceiptSourceCandidatePage(
      { keyword: ' PO-001 ', currentRecordId: '9002' },
      1,
      30,
    )

    expect(httpGetMock).toHaveBeenCalledWith(
      '/invoice-receipts/source-candidates',
      {
        params: {
          keyword: 'PO-001',
          currentRecordId: '9002',
          page: 1,
          size: 30,
        },
      },
    )
  })
})
