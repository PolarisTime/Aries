import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchAllModuleRowsMock = vi.hoisted(() => vi.fn())
const fetchModulePageMock = vi.hoisted(() => vi.fn())
const applyClientFiltersMock = vi.hoisted(() => vi.fn())
const buildQueryParamsMock = vi.hoisted(() => vi.fn())
const paginateRowsMock = vi.hoisted(() => vi.fn())
const shouldClientFilterMock = vi.hoisted(() => vi.fn())
const buildTableResponseMock = vi.hoisted(() => vi.fn())
const reportClientFilterFallbackMock = vi.hoisted(() => vi.fn())
const reportUnpaginatedRowFetchMock = vi.hoisted(() => vi.fn())
const normalizeRowsMock = vi.hoisted(() => vi.fn())
const getModuleConfigMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const isSuccessCodeMock = vi.hoisted(() => vi.fn())
const getApiMessageMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business-listing-fetch', () => ({
  fetchAllModuleRows: fetchAllModuleRowsMock,
  fetchModulePage: fetchModulePageMock,
}))

vi.mock('@/api/business-listing-filtering', () => ({
  applyClientFilters: applyClientFiltersMock,
  buildQueryParams: buildQueryParamsMock,
  paginateRows: paginateRowsMock,
  shouldClientFilter: shouldClientFilterMock,
}))

vi.mock('@/api/business-listing-response', () => ({
  buildTableResponse: buildTableResponseMock,
}))

vi.mock('@/api/business-listing-warnings', () => ({
  reportClientFilterFallback: reportClientFilterFallbackMock,
  reportUnpaginatedRowFetch: reportUnpaginatedRowFetchMock,
}))

vi.mock('@/api/business-normalizers', () => ({
  normalizeRows: normalizeRowsMock,
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

vi.mock('@/api/client', () => ({
  http: { get: httpGetMock },
  isSuccessCode: isSuccessCodeMock,
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: getApiMessageMock,
}))

import {
  listBusinessModule,
  searchBusinessModule,
  listAllBusinessModuleRows,
} from './business-listing'

describe('business-listing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getModuleConfigMock.mockReturnValue({
      path: '/purchase-orders',
      readOnly: false,
      supportsSearch: true,
    })
    normalizeRowsMock.mockImplementation((rows: unknown[]) => rows as never[])
    buildTableResponseMock.mockImplementation(
      (rows: unknown[], total: number) => ({ rows, total }),
    )
    buildQueryParamsMock.mockReturnValue({
      keyword: 'test',
      page: 0,
      size: 50,
    })
    isSuccessCodeMock.mockImplementation((code: unknown) => Number(code) === 0)
    getApiMessageMock.mockReturnValue('加载搜索结果失败')
  })

  describe('listBusinessModule', () => {
    it('uses client-side filter when shouldClientFilter returns true', async () => {
      shouldClientFilterMock.mockReturnValue(true)
      fetchAllModuleRowsMock.mockResolvedValue({
        rows: [{ id: '1', name: 'filtered' }],
        truncated: false,
      })
      applyClientFiltersMock.mockReturnValue([{ id: '1', name: 'filtered' }])
      paginateRowsMock.mockReturnValue([{ id: '1', name: 'filtered' }])

      const result = await listBusinessModule(
        'purchase-order',
        { customField: 'value' },
        { currentPage: 1, pageSize: 20 },
      )

      expect(reportClientFilterFallbackMock).toHaveBeenCalledWith(
        'purchase-order',
        { customField: 'value' },
      )
      expect(result).toEqual({
        rows: [{ id: '1', name: 'filtered' }],
        total: 1,
      })
    })

    it('uses server-side pagination when not client filtering', async () => {
      shouldClientFilterMock.mockReturnValue(false)
      fetchModulePageMock.mockResolvedValue({
        rows: [{ id: '1' }],
        totalElements: 1,
        hasMore: false,
      })

      const result = await listBusinessModule(
        'purchase-order',
        { keyword: 'test' },
        { currentPage: 1, pageSize: 50 },
      )

      expect(fetchModulePageMock).toHaveBeenCalledWith(
        'purchase-order',
        { keyword: 'test', page: 0, size: 50 },
        0,
        50,
        undefined,
        undefined,
      )
      expect(result).toEqual({ rows: [{ id: '1' }], total: 1 })
    })

    it('passes config and fields to fetchModulePage', async () => {
      shouldClientFilterMock.mockReturnValue(false)
      fetchModulePageMock.mockResolvedValue({
        rows: [],
        totalElements: 0,
        hasMore: false,
      })

      const config = { signal: new AbortController().signal } as never
      await listBusinessModule(
        'purchase-order',
        {},
        { currentPage: 1, pageSize: 20 },
        config,
        ['id', 'name'],
      )

      expect(fetchModulePageMock).toHaveBeenCalledWith(
        'purchase-order',
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        config,
        ['id', 'name'],
      )
    })
  })

  describe('searchBusinessModule', () => {
    it('returns empty array for read-only modules', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/read-only',
        readOnly: true,
      })

      const result = await searchBusinessModule('read-only')
      expect(result).toEqual([])
    })

    it('calls search endpoint for modules with supportsSearch', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [{ id: '1', orderNo: 'PO2026' }],
      })

      const result = await searchBusinessModule('purchase-order', 'PO2026', 100)

      expect(httpGetMock).toHaveBeenCalledWith(
        '/purchase-orders/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keyword: 'PO2026',
            limit: 100,
          }),
        }),
      )
      expect(result).toEqual([{ id: '1', orderNo: 'PO2026' }])
    })

    it('caps limit to 500', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [] })

      await searchBusinessModule('purchase-order', 'PO', 1000)
      expect(httpGetMock).toHaveBeenCalledWith(
        '/purchase-orders/search',
        expect.objectContaining({
          params: expect.objectContaining({ limit: 500 }),
        }),
      )
    })

    it('falls back to page fetch when search endpoint fails with supportsSearch not strictly true', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        supportsSearch: 'fallback',
      } as never)
      httpGetMock.mockRejectedValue(new Error('Network error'))
      fetchModulePageMock.mockResolvedValue({
        rows: [{ id: '1' }],
        totalElements: 1,
      })

      const result = await searchBusinessModule('purchase-order', 'PO', 100)

      expect(fetchModulePageMock).toHaveBeenCalled()
      expect(result).toEqual([{ id: '1' }])
    })

    it('throws when search fails and supportsSearch is explicitly true', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        supportsSearch: true,
      })
      httpGetMock.mockRejectedValue(new Error('Network error'))
      getApiMessageMock.mockReturnValue('加载搜索结果失败')

      await expect(
        searchBusinessModule('purchase-order', 'PO', 100),
      ).rejects.toThrow('加载搜索结果失败: purchase-order')
    })

    it('merges config params into search request', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: [] })
      const config = { params: { extra: 'val' } } as never

      await searchBusinessModule('purchase-order', 'PO', 100, config)

      expect(httpGetMock).toHaveBeenCalledWith(
        '/purchase-orders/search',
        expect.objectContaining({
          params: expect.objectContaining({ keyword: 'PO', extra: 'val' }),
        }),
      )
    })

    it('returns empty when search endpoint returns non-success code', async () => {
      httpGetMock.mockResolvedValue({ code: 4000, data: [] })

      await searchBusinessModule('purchase-order', 'PO', 100)
    })

    it('uses fallback fetchModulePage when supportsSearch is false', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        supportsSearch: false,
      } as never)
      fetchModulePageMock.mockResolvedValue({
        rows: [{ id: '2' }],
        totalElements: 1,
      })

      const result = await searchBusinessModule('purchase-order', 'test', 50)

      expect(httpGetMock).not.toHaveBeenCalled()
      expect(fetchModulePageMock).toHaveBeenCalled()
      expect(result).toEqual([{ id: '2' }])
    })
  })

  describe('listAllBusinessModuleRows', () => {
    it('fetches all rows and applies client filter when needed', async () => {
      shouldClientFilterMock.mockReturnValue(true)
      fetchAllModuleRowsMock.mockResolvedValue({
        rows: [{ id: '1' }, { id: '2' }],
        truncated: false,
      })
      applyClientFiltersMock.mockReturnValue([{ id: '1' }])

      const result = await listAllBusinessModuleRows('purchase-order', {
        customField: 'val',
      })

      expect(reportClientFilterFallbackMock).toHaveBeenCalled()
      expect(reportUnpaginatedRowFetchMock).toHaveBeenCalledWith(
        'purchase-order',
        2,
      )
      expect(result).toEqual([{ id: '1' }])
    })

    it('returns rows directly when no client filter needed', async () => {
      shouldClientFilterMock.mockReturnValue(false)
      fetchAllModuleRowsMock.mockResolvedValue({
        rows: [{ id: '1' }, { id: '2' }],
        truncated: false,
      })

      const result = await listAllBusinessModuleRows('purchase-order', {})

      expect(reportUnpaginatedRowFetchMock).toHaveBeenCalled()
      expect(applyClientFiltersMock).not.toHaveBeenCalled()
      expect(result).toEqual([{ id: '1' }, { id: '2' }])
    })
  })
})
