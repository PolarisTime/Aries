import { describe, expect, it } from 'vitest'
import { FULL_SCAN_PAGE_SIZE } from './business-listing-constants'
import {
  applyClientFilters,
  applyFilterDefinition,
  buildFilterParams,
  buildQueryParams,
  getUnsupportedFilterKeys,
  hasValue,
  isServerFilterKey,
  paginateRows,
  shouldClientFilter,
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

  it('buildFilterParams maps date range keys', () => {
    const params = buildFilterParams('purchase-order', {
      orderDate: ['2026-01-01', '2026-01-31'],
      keyword: 'test',
    })
    expect(params).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      keyword: 'test',
    })
  })

  it('buildFilterParams skips empty values', () => {
    const params = buildFilterParams('purchase-order', {
      keyword: '',
      status: null,
    })
    expect(params).toEqual({})
  })

  it('getUnsupportedFilterKeys returns keys not mapped to server', () => {
    const keys = getUnsupportedFilterKeys('purchase-order', {
      keyword: 'test',
      clientField: 'value',
    })
    expect(keys).toEqual(['clientField'])
  })

  it('shouldClientFilter returns true when client-side filter needed', () => {
    expect(shouldClientFilter('purchase-order', { clientField: 'value' })).toBe(
      true,
    )
  })

  it('shouldClientFilter returns false when all keys are server-side', () => {
    expect(shouldClientFilter('purchase-order', { keyword: 'test' })).toBe(
      false,
    )
  })

  it('shouldClientFilter returns false when search is empty', () => {
    expect(shouldClientFilter('purchase-order', {})).toBe(false)
  })

  it('applyClientFilters returns all rows when no filters defined', () => {
    const rows = [{ id: '1' }, { id: '2' }] as any[]
    expect(applyClientFilters('permission', rows, {})).toEqual(rows)
  })

  it('paginateRows returns correct slice', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] as any[]
    expect(paginateRows(rows, { currentPage: 2, pageSize: 2 })).toEqual([
      { id: '3' },
      { id: '4' },
    ])
  })

  it('paginateRows handles page 0', () => {
    const rows = [{ id: '1' }, { id: '2' }] as any[]
    expect(paginateRows(rows, { currentPage: 0, pageSize: 2 })).toEqual([
      { id: '1' },
      { id: '2' },
    ])
  })

  describe('hasValue', () => {
    it('returns false for null', () => {
      expect(hasValue(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(hasValue(undefined)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(hasValue('')).toBe(false)
    })

    it('returns false for whitespace-only string', () => {
      expect(hasValue('   ')).toBe(false)
    })

    it('returns true for non-empty string', () => {
      expect(hasValue('test')).toBe(true)
    })

    it('returns false for empty array', () => {
      expect(hasValue([])).toBe(false)
    })

    it('returns false for array with falsy values', () => {
      expect(hasValue([null, '', false])).toBe(false)
    })

    it('returns true for array with truthy values', () => {
      expect(hasValue(['a', 'b'])).toBe(true)
    })

    it('returns true for number', () => {
      expect(hasValue(0)).toBe(true)
    })

    it('returns true for boolean false', () => {
      expect(hasValue(false)).toBe(true)
    })

    it('returns true for object', () => {
      expect(hasValue({})).toBe(true)
    })
  })

  describe('isServerFilterKey', () => {
    it('returns true for native filter key', () => {
      expect(
        isServerFilterKey(
          { path: '/test', nativeFilterKeys: ['keyword'] },
          'keyword',
        ),
      ).toBe(true)
    })

    it('returns true for date range mapping key', () => {
      expect(
        isServerFilterKey(
          {
            path: '/test',
            dateRangeMapping: { orderDate: { startKey: 's', endKey: 'e' } },
          },
          'orderDate',
        ),
      ).toBe(true)
    })

    it('returns false for unmapped key', () => {
      expect(isServerFilterKey({ path: '/test' }, 'unknown')).toBe(false)
    })
  })

  describe('applyFilterDefinition', () => {
    it('returns true when rawValue has no value', () => {
      expect(
        applyFilterDefinition(
          { id: '1' },
          { key: 'k', type: 'input', label: 'L' },
          null,
        ),
      ).toBe(true)
    })

    it('returns true when input rawValue normalizes to an empty keyword', () => {
      expect(
        applyFilterDefinition(
          { id: '1', name: 'test' },
          { key: 'k', type: 'input', label: 'L', clientSearchKeys: ['name'] },
          {},
        ),
      ).toBe(true)
    })

    describe('input filter', () => {
      it('returns true when keyword is empty after trim', () => {
        expect(
          applyFilterDefinition(
            { id: '1', name: 'test' },
            { key: 'k', type: 'input', label: 'L', clientSearchKeys: ['name'] },
            '   ',
          ),
        ).toBe(true)
      })

      it('matches against clientSearchKeys', () => {
        expect(
          applyFilterDefinition(
            { id: '1', orderNo: 'PO001' },
            {
              key: 'k',
              type: 'input',
              label: 'L',
              clientSearchKeys: ['orderNo'],
            },
            'PO001',
          ),
        ).toBe(true)
      })

      it('rejects when clientSearchKeys do not match', () => {
        expect(
          applyFilterDefinition(
            { id: '1', orderNo: 'PO001' },
            {
              key: 'k',
              type: 'input',
              label: 'L',
              clientSearchKeys: ['orderNo'],
            },
            'XS',
          ),
        ).toBe(false)
      })

      it('matches against line item keys', () => {
        expect(
          applyFilterDefinition(
            { id: '1', items: [{ materialName: '盘螺' }] },
            {
              key: 'k',
              type: 'input',
              label: 'L',
              clientSearchKeys: [],
              clientSearchLineItemKeys: ['materialName'],
            },
            '盘螺',
          ),
        ).toBe(true)
      })

      it('returns false when line item search fails and no record search keys', () => {
        expect(
          applyFilterDefinition(
            { id: '1', items: [{ materialName: '盘螺' }] },
            {
              key: 'k',
              type: 'input',
              label: 'L',
              clientSearchKeys: [],
              clientSearchLineItemKeys: ['materialName'],
            },
            '无匹配',
          ),
        ).toBe(false)
      })

      it('returns false when record has no items array for line item search', () => {
        expect(
          applyFilterDefinition(
            { id: '1' },
            {
              key: 'k',
              type: 'input',
              label: 'L',
              clientSearchKeys: [],
              clientSearchLineItemKeys: ['materialName'],
            },
            'test',
          ),
        ).toBe(false)
      })

      it('falls back to full-text search when no search keys defined', () => {
        expect(
          applyFilterDefinition(
            { id: '1', note: '特殊备注' },
            { key: 'k', type: 'input', label: 'L' },
            '备注',
          ),
        ).toBe(true)
      })

      it('returns false when full-text search finds no match', () => {
        expect(
          applyFilterDefinition(
            { id: '1', note: 'abc' },
            { key: 'k', type: 'input', label: 'L' },
            'xyz',
          ),
        ).toBe(false)
      })
    })

    describe('select filter', () => {
      it('returns true when value matches', () => {
        expect(
          applyFilterDefinition(
            { id: '1', status: '启用' },
            { key: 'status', type: 'select', label: 'L' },
            '启用',
          ),
        ).toBe(true)
      })

      it('returns false when value does not match', () => {
        expect(
          applyFilterDefinition(
            { id: '1', status: '停用' },
            { key: 'status', type: 'select', label: 'L' },
            '启用',
          ),
        ).toBe(false)
      })
    })

    describe('dateRange filter', () => {
      it('returns true when date is within range', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '2026-01-15' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['2026-01-01', '2026-01-31'],
          ),
        ).toBe(true)
      })

      it('returns true when current date is empty', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['2026-01-01', '2026-01-31'],
          ),
        ).toBe(true)
      })

      it('returns true when start is empty', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '2026-01-15' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['', '2026-01-31'],
          ),
        ).toBe(true)
      })

      it('returns true when end is empty', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '2026-01-15' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['2026-01-01', ''],
          ),
        ).toBe(true)
      })

      it('returns false when date is out of range', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '2026-02-15' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['2026-01-01', '2026-01-31'],
          ),
        ).toBe(false)
      })

      it('returns true when rawValue is not a 2-element array', () => {
        expect(
          applyFilterDefinition(
            { id: '1', date: '2026-01-15' },
            { key: 'date', type: 'dateRange', label: 'L' },
            ['2026-01-01'],
          ),
        ).toBe(true)
      })
    })

    it('returns true for unknown filter type', () => {
      expect(
        applyFilterDefinition(
          { id: '1' },
          { key: 'k', type: 'unknown' as any, label: 'L' },
          'value',
        ),
      ).toBe(true)
    })
  })

  describe('buildFilterParams', () => {
    it('skips unsupported client-only filter keys', () => {
      const params = buildFilterParams('purchase-order', {
        clientField: 'value',
      })
      expect(params).toEqual({})
    })

    it('handles array values for server filter keys', () => {
      const params = buildFilterParams('purchase-order', {
        keyword: ['a', 'b'],
      })
      expect(params).toEqual({ keyword: ['a', 'b'] })
    })

    it('passes through non-2-element date range array to server filter', () => {
      const params = buildFilterParams('purchase-order', {
        orderDate: ['2026-01-01'],
      })
      expect(params).toEqual({ orderDate: ['2026-01-01'] })
    })
  })

  describe('buildQueryParams', () => {
    it('uses FULL_SCAN_PAGE_SIZE when useClientFilter is true', () => {
      const params = buildQueryParams(
        'purchase-order',
        {},
        { currentPage: 2, pageSize: 50 },
        true,
      )
      expect(params.page).toBe(0)
      expect(params.size).toBe(FULL_SCAN_PAGE_SIZE)
    })

    it('uses default sort params when sortBy/sortDirection not provided', () => {
      const params = buildQueryParams(
        'purchase-order',
        {},
        { currentPage: 1, pageSize: 20 },
        false,
      )
      expect(params).not.toHaveProperty('sortBy')
      expect(params).not.toHaveProperty('direction')
    })
  })
})
