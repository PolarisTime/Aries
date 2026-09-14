import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
}))

import { EntityIdContractError } from '@/types/entity-id'
import { getInventoryBalances, getInventoryTransactions } from './inventory'

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
}

describe('库存余额查询', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('解析雪花字符串 ID、字符串小数与分页字段', async () => {
    apiGetMock.mockResolvedValue({
      content: [
        {
          materialId: '700500000000000130',
          materialCode: 'M001',
          brand: '万泰',
          material: 'HRB400E',
          spec: '12',
          length: '9米',
          unit: '吨',
          warehouseId: '800500000000000001',
          warehouseName: '一号库',
          batchNo: 'B-20260901',
          quantity: '12.5',
          amount: '40625.00',
          avgUnitCost: '3250.00',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 30,
      hasMore: false,
    })

    const page = await getInventoryBalances({ page: 0, size: 30 })

    expect(page.totalElements).toBe(1)
    expect(page.hasMore).toBe(false)
    expect(page.content[0]).toMatchObject({
      materialId: '700500000000000130',
      warehouseId: '800500000000000001',
      quantity: 12.5,
      amount: 40625,
      avgUnitCost: 3250,
      batchNo: 'B-20260901',
    })
    expect(apiGetMock).toHaveBeenCalledTimes(1)
    const [endpoint, , options] = apiGetMock.mock.calls[0]
    expect(endpoint).toBe('/inventory/balances')
    expect(options.params).toEqual({ page: 0, size: 30 })
  })

  it('仅携带非空筛选条件并规范化分页边界', async () => {
    apiGetMock.mockResolvedValue(emptyPage)

    await getInventoryBalances({
      page: -5,
      size: 0,
      keyword: '  螺纹  ',
      warehouseId: '800500000000000001',
    })

    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params).toEqual({
      keyword: '螺纹',
      warehouseId: '800500000000000001',
      page: 0,
      size: 1,
    })
    expect(options.params).not.toHaveProperty('materialId')
    expect(options.params).not.toHaveProperty('sortBy')
  })

  it('非法雪花 ID 触发契约错误', async () => {
    apiGetMock.mockResolvedValue({
      ...emptyPage,
      content: [
        {
          materialId: '0',
          warehouseId: '1',
          quantity: 1,
          amount: 1,
          avgUnitCost: 1,
        },
      ],
    })

    await expect(getInventoryBalances({ page: 0, size: 30 })).rejects.toThrow(
      EntityIdContractError,
    )
  })
})

describe('库存流水查询', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('映射类型与日期筛选并规范出库方向', async () => {
    apiGetMock.mockResolvedValue({
      content: [
        {
          id: '900500000000000001',
          transactionNo: 'TXN-20260901-001',
          transactionType: 'SALES_OUTBOUND',
          materialId: '700500000000000130',
          materialCode: 'M001',
          warehouseId: '800500000000000001',
          warehouseName: '一号库',
          batchNo: 'B-20260901',
          direction: -1,
          quantity: '3.5',
          quantityUnit: '吨',
          unitCost: '3200.00',
          amount: '11200.00',
          sourceDocumentType: 'SALES_OUTBOUND',
          sourceDocumentId: '600500000000000001',
          sourceDocumentNo: 'CK-20260901-001',
          sourceItemId: '600500000000000002',
          occurredAt: '2026-09-01T08:30:00',
          createdAt: '2026-09-01T08:31:00',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      currentPage: 1,
      pageSize: 20,
      hasMore: true,
    })

    const page = await getInventoryTransactions({
      page: 1,
      size: 20,
      transactionType: 'SALES_OUTBOUND',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    })

    expect(page.content[0]).toMatchObject({
      id: '900500000000000001',
      direction: -1,
      quantity: 3.5,
      amount: 11200,
      unitCost: 3200,
      sourceDocumentId: '600500000000000001',
      sourceItemId: '600500000000000002',
      occurredAt: '2026-09-01T08:30:00',
    })
    const [endpoint, , options] = apiGetMock.mock.calls[0]
    expect(endpoint).toBe('/inventory/transactions')
    expect(options.params).toEqual({
      transactionType: 'SALES_OUTBOUND',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      page: 1,
      size: 20,
    })
  })

  it('未提供可选筛选时不携带对应参数', async () => {
    apiGetMock.mockResolvedValue(emptyPage)

    await getInventoryTransactions({ page: 0, size: 30 })

    const [, , options] = apiGetMock.mock.calls[0]
    expect(options.params).toEqual({ page: 0, size: 30 })
    expect(options.params).not.toHaveProperty('transactionType')
    expect(options.params).not.toHaveProperty('startDate')
    expect(options.params).not.toHaveProperty('endDate')
  })
})
