import { describe, expect, it } from 'vitest'
import {
  applyClientFilters,
  buildQueryParams,
} from './business-listing-filtering'

describe('business-listing-filtering', () => {
  it('builds default server pagination and sorting params', () => {
    expect(
      buildQueryParams(
        'purchase-order',
        { keyword: 'PO2026' },
        {
          currentPage: 2,
          pageSize: 50,
          sortBy: 'orderDate',
          sortDirection: 'desc',
        },
        false,
      ),
    ).toEqual({
      keyword: 'PO2026',
      page: 1,
      size: 50,
      sortBy: 'orderDate',
      direction: 'desc',
    })
  })

  it('uses module-specific sort direction param when required by backend', () => {
    expect(
      buildQueryParams(
        'inventory-report',
        { keyword: '盘螺' },
        {
          currentPage: 1,
          pageSize: 20,
          sortBy: 'weightTon',
          sortDirection: 'asc',
        },
        false,
      ),
    ).toEqual({
      keyword: '盘螺',
      page: 0,
      size: 20,
      sortBy: 'weightTon',
      sortDirection: 'asc',
    })
  })

  it('supports sales-order product info client filtering against line items', () => {
    expect(
      applyClientFilters(
        'sales-order',
        [
          {
            id: '1',
            orderNo: 'XS2026-001',
            customerName: '华东客户',
            items: [
              {
                id: 'item-1',
                materialCode: 'PL12',
                materialName: '盘螺',
                spec: '12mm',
              },
            ],
          },
          {
            id: '2',
            orderNo: 'XS2026-002',
            customerName: '华南客户',
            items: [
              {
                id: 'item-2',
                materialCode: 'LU16',
                materialName: '螺纹钢',
                spec: '16mm',
              },
            ],
          },
        ],
        { productKeyword: '盘螺' },
      ).map((record) => record.id),
    ).toEqual(['1'])
  })

  it('limits sales-order keyword client filtering to order number', () => {
    expect(
      applyClientFilters(
        'sales-order',
        [
          {
            id: '1',
            orderNo: 'XS2026-001',
            customerName: '订单编号客户',
          },
          {
            id: '2',
            orderNo: 'SO-002',
            customerName: '普通客户',
          },
        ],
        { keyword: '订单编号' },
      ),
    ).toEqual([])
  })
})
