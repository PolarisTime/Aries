import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getBusinessModuleDetail: vi.fn(),
  httpPut: vi.fn(),
  listAllBusinessModuleRows: vi.fn(),
  withIdempotencyKey: vi.fn(() => ({
    headers: { 'X-Idempotency-Key': 'test-key' },
  })),
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: mocks.getBusinessModuleDetail,
  listAllBusinessModuleRows: mocks.listAllBusinessModuleRows,
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: <T>(response: T) => response,
  http: { put: mocks.httpPut },
}))

vi.mock('@/api/idempotency', () => ({
  withIdempotencyKey: mocks.withIdempotencyKey,
}))

import {
  fetchPaymentPrepaymentAllocationContext,
  listPaymentSupplierStatementCandidates,
  replacePaymentPrepaymentAllocations,
} from './payment-prepayment-allocations'

describe('payment-prepayment-allocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the authoritative payment detail including current allocations', async () => {
    const payment = {
      id: '901',
      amount: 1200,
      items: [
        {
          id: '801',
          sourceStatementId: '701',
          allocatedAmount: '200.50',
        },
      ],
    }
    mocks.getBusinessModuleDetail.mockResolvedValue({ data: payment })

    await expect(
      fetchPaymentPrepaymentAllocationContext('901'),
    ).resolves.toEqual(payment)
    expect(mocks.getBusinessModuleDetail).toHaveBeenCalledWith('payment', '901')
  })

  it('lists confirmed statements by authoritative supplier code and settlement company without filtering by supplier name', async () => {
    mocks.listAllBusinessModuleRows.mockResolvedValue([
      {
        id: '701',
        statementNo: 'GYDZ-001',
        supplierCode: 'SUP-001',
        supplierName: '供应商新名称',
        settlementCompanyId: '301',
        status: '已确认',
      },
      {
        id: '702',
        statementNo: 'GYDZ-002',
        supplierCode: 'SUP-002',
        supplierName: '供应商甲',
        settlementCompanyId: '301',
        status: '已确认',
      },
      {
        id: '703',
        statementNo: 'GYDZ-003',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '302',
        status: '已确认',
      },
      {
        id: '704',
        statementNo: 'GYDZ-004',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '301',
        status: '待确认',
      },
    ])

    await expect(
      listPaymentSupplierStatementCandidates({
        supplierCode: 'SUP-001',
        settlementCompanyId: '301',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: '701', statementNo: 'GYDZ-001' }),
    ])
    expect(mocks.listAllBusinessModuleRows).toHaveBeenCalledWith(
      'supplier-statement',
      {
        settlementCompanyId: '301',
        status: '已确认',
      },
    )
    expect(
      Object.hasOwn(
        mocks.listAllBusinessModuleRows.mock.calls[0]?.[1] || {},
        'supplierName',
      ),
    ).toBe(false)
  })

  it('replaces allocations through the dedicated sub-resource', async () => {
    mocks.httpPut.mockResolvedValue({
      code: 0,
      data: [
        {
          id: '801',
          lineNo: 1,
          sourceStatementId: '701',
          statementNo: 'GYDZ-001',
          statementBalanceAmount: '300.25',
          allocatedAmount: '200.50',
        },
      ],
    })

    await expect(
      replacePaymentPrepaymentAllocations('901', [
        {
          id: '801',
          sourceStatementId: '701',
          allocatedAmount: '200.50',
        },
      ]),
    ).resolves.toEqual([
      {
        id: '801',
        lineNo: 1,
        sourceStatementId: '701',
        statementNo: 'GYDZ-001',
        statementBalanceAmount: 300.25,
        allocatedAmount: 200.5,
      },
    ])
    expect(mocks.httpPut).toHaveBeenCalledWith(
      '/payments/901/prepayment-allocations',
      {
        items: [
          {
            id: '801',
            sourceStatementId: '701',
            allocatedAmount: 200.5,
          },
        ],
      },
      { headers: { 'X-Idempotency-Key': 'test-key' } },
    )
  })

  it('sends an empty collection to clear all allocations', async () => {
    mocks.httpPut.mockResolvedValue({ code: 0, data: [] })

    await expect(
      replacePaymentPrepaymentAllocations('901', []),
    ).resolves.toEqual([])
    expect(mocks.httpPut).toHaveBeenCalledWith(
      '/payments/901/prepayment-allocations',
      { items: [] },
      { headers: { 'X-Idempotency-Key': 'test-key' } },
    )
  })
})
