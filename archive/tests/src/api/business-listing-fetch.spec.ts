import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const normalizeRowsMock = vi.hoisted(() => vi.fn())
const getModuleConfigMock = vi.hoisted(() => vi.fn())
const pageContentMock = vi.hoisted(() => vi.fn())
const pageTotalElementsMock = vi.hoisted(() => vi.fn())
const pageTotalPagesMock = vi.hoisted(() => vi.fn())
const pageLastMock = vi.hoisted(() => vi.fn())
const pageHasMoreMock = vi.hoisted(() => vi.fn())
const buildFilterParamsMock = vi.hoisted(() => vi.fn())
const reportClientFilterTruncationMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: { get: httpGetMock },
}))

vi.mock('@/api/business-normalizers', () => ({
  normalizeRows: normalizeRowsMock,
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

vi.mock('@/api/page-contract', () => ({
  pageContent: pageContentMock,
  pageTotalElements: pageTotalElementsMock,
  pageTotalPages: pageTotalPagesMock,
  pageLast: pageLastMock,
  pageHasMore: pageHasMoreMock,
}))

vi.mock('./business-listing-filtering', () => ({
  buildFilterParams: buildFilterParamsMock,
}))

vi.mock('./business-listing-warnings', () => ({
  reportClientFilterTruncation: reportClientFilterTruncationMock,
}))

import { fetchAllModuleRows, fetchModulePage } from './business-listing-fetch'

describe('business-listing-fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getModuleConfigMock.mockReturnValue({
      path: '/purchase-orders',
      fieldsParam: 'fields',
      sortByParam: 'sortBy',
      sortDirectionParam: 'direction',
    })
    normalizeRowsMock.mockImplementation((rows: unknown[]) => rows as never[])
  })

  describe('fetchModulePage', () => {
    const pageData = {
      content: [{ id: '1' }],
      totalElements: 1,
      totalPages: 1,
      last: true,
    }

    beforeEach(() => {
      httpGetMock.mockResolvedValue({ code: 0, data: pageData })
      pageContentMock.mockReturnValue([{ id: '1' }])
      pageTotalElementsMock.mockReturnValue(1)
      pageTotalPagesMock.mockReturnValue(1)
      pageLastMock.mockReturnValue(true)
      pageHasMoreMock.mockReturnValue(false)
    })

    it('fetches a single page successfully', async () => {
      const result = await fetchModulePage(
        'purchase-order',
        { keyword: 'PO' },
        0,
        50,
      )

      expect(httpGetMock).toHaveBeenCalledWith('/purchase-orders', {
        params: { keyword: 'PO', page: 0, size: 50 },
      })
      expect(result).toEqual({
        rows: [{ id: '1' }],
        totalElements: 1,
        totalPages: 1,
        last: true,
        hasMore: false,
      })
    })

    it('includes fields param when fields provided', async () => {
      await fetchModulePage('purchase-order', {}, 0, 50, undefined, [
        'id',
        'name',
      ])

      expect(httpGetMock).toHaveBeenCalledWith('/purchase-orders', {
        params: { page: 0, size: 50, fields: 'id,name' },
      })
    })

    it('uses custom fieldsParam name', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/test',
        fieldsParam: 'customFields',
      })

      await fetchModulePage('test', {}, 0, 20, undefined, ['a', 'b'])

      expect(httpGetMock).toHaveBeenCalledWith('/test', {
        params: { page: 0, size: 20, customFields: 'a,b' },
      })
    })

    it('falls back to default fields param name', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/test',
      })

      await fetchModulePage('test', {}, 0, 20, undefined, ['a', 'b'])

      expect(httpGetMock).toHaveBeenCalledWith('/test', {
        params: { page: 0, size: 20, fields: 'a,b' },
      })
    })

    it('merges config params with additional params from config argument', async () => {
      const configArg = { params: { extra: 'value' } }
      await fetchModulePage(
        'purchase-order',
        { keyword: 'test' },
        1,
        30,
        configArg,
      )

      expect(httpGetMock).toHaveBeenCalledWith('/purchase-orders', {
        params: { keyword: 'test', page: 1, size: 30, extra: 'value' },
      })
    })
  })

  describe('fetchAllModuleRows', () => {
    beforeEach(() => {
      buildFilterParamsMock.mockReturnValue({ keyword: 'test' })
      pageContentMock.mockReturnValue([{ id: '1' }, { id: '2' }])
      pageTotalElementsMock.mockReturnValue(2)
      pageTotalPagesMock.mockReturnValue(1)
      pageLastMock.mockReturnValue(true)
      pageHasMoreMock.mockReturnValue(false)
      httpGetMock.mockResolvedValue({ code: 0, data: {} })
    })

    it('fetches all rows until last page', async () => {
      const result = await fetchAllModuleRows('purchase-order', {
        keyword: 'test',
      })

      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.truncated).toBe(false)
    })

    it('truncates when enforceLimit is true and max rows hit', async () => {
      // Simulate multiple pages
      pageLastMock.mockReturnValue(false)
      pageTotalPagesMock.mockReturnValue(100)
      // Return many rows per page
      const manyRows = Array.from({ length: 200 }, (_, i) => ({
        id: String(i),
      }))
      pageContentMock.mockReturnValue(manyRows)

      const result = await fetchAllModuleRows(
        'purchase-order',
        { keyword: 'test' },
        true,
      )

      expect(result.truncated).toBe(true)
      expect(reportClientFilterTruncationMock).toHaveBeenCalled()
    })

    it('stops fetching when last page reached', async () => {
      pageContentMock.mockReturnValueOnce([{ id: '1' }])
      pageLastMock.mockReturnValueOnce(true)

      const result = await fetchAllModuleRows('test', {})

      expect(httpGetMock).toHaveBeenCalledTimes(1)
      expect(result.truncated).toBe(false)
    })
  })
})
