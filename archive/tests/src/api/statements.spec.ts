import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())
const getModuleConfigMock = vi.hoisted(() => vi.fn())
const pageContentMock = vi.hoisted(() => vi.fn())
const pageTotalElementsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

vi.mock('@/api/page-contract', () => ({
  pageContent: pageContentMock,
  pageTotalElements: pageTotalElementsMock,
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asId: (v: unknown) => (v != null ? String(v) : ''),
  asString: (v: unknown) => String(v ?? ''),
}))

import {
  listAllStatementCandidates,
  listStatementCandidatePage,
  normalizeRecord,
} from './statements'

describe('statements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
    getModuleConfigMock.mockReturnValue({ path: '/supplier-statements' })
    pageContentMock.mockImplementation(
      (data: { content?: unknown[] }) => data.content || [],
    )
    pageTotalElementsMock.mockImplementation(
      (data: { totalElements?: number }) => data.totalElements || 0,
    )
  })

  describe('listAllStatementCandidates', () => {
    it('fetches all candidates in single page', async () => {
      const rows = [{ id: '1', name: 'item1' }]
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: rows, totalElements: 1 },
      })

      const result = await listAllStatementCandidates(
        'supplier-statement',
        '',
        200,
        {},
      )

      expect(getModuleConfigMock).toHaveBeenCalledWith('supplier-statement')
      expect(httpGetMock).toHaveBeenCalledWith(
        '/supplier-statements/candidates',
        { params: { keyword: '', page: 0, size: 200 } },
      )
      expect(result).toHaveLength(1)
    })

    it('paginates when total exceeds page size', async () => {
      const page1Rows = Array.from({ length: 2 }, (_, i) => ({
        id: String(i + 1),
      }))
      const page2Rows = [{ id: '3' }]

      httpGetMock
        .mockResolvedValueOnce({
          code: 0,
          data: { content: page1Rows, totalElements: 3 },
        })
        .mockResolvedValueOnce({
          code: 0,
          data: { content: page2Rows, totalElements: 3 },
        })

      const result = await listAllStatementCandidates(
        'supplier-statement',
        '',
        2,
        {},
      )

      expect(httpGetMock).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(3)
    })

    it('passes filters to request', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: [], totalElements: 0 },
      })

      await listAllStatementCandidates('supplier-statement', 'test', 200, {
        status: '启用',
      })

      expect(httpGetMock).toHaveBeenCalledWith(
        '/supplier-statements/candidates',
        { params: { keyword: 'test', page: 0, size: 200, status: '启用' } },
      )
    })

    it('maps generic currentRecordId to currentStatementId without leaking the generic key', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: [], totalElements: 0 },
      })

      await listAllStatementCandidates('supplier-statement', '', 200, {
        supplierId: '700520000000000001',
        currentRecordId: '700520000000000099',
      })

      expect(httpGetMock).toHaveBeenCalledWith(
        '/supplier-statements/candidates',
        {
          params: {
            supplierId: '700520000000000001',
            currentStatementId: '700520000000000099',
            keyword: '',
            page: 0,
            size: 200,
          },
        },
      )
      expect(
        httpGetMock.mock.calls[0][1].params.currentRecordId,
      ).toBeUndefined()
    })
  })

  describe('listStatementCandidatePage', () => {
    it('returns table response format', async () => {
      const rows = [{ id: '1' }]
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: rows, totalElements: 1 },
      })

      const result = await listStatementCandidatePage(
        'supplier-statement',
        { keyword: 'test', page: 0, size: 10 },
        0,
        10,
      )

      expect(result.code).toBe(0)
      expect(result.data.rows).toEqual(rows)
      expect(result.data.total).toBe(1)
    })

    it('handles empty keyword', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: [], totalElements: 0 },
      })

      const result = await listStatementCandidatePage(
        'supplier-statement',
        { keyword: '  ' },
        0,
        10,
      )

      expect(result.data.rows).toEqual([])
    })
  })

  describe('normalizeRecord', () => {
    it('normalizes the root and nested declared entity ids', () => {
      const result = normalizeRecord({ id: '123', name: 'test' })
      expect(result.id).toBe('123')
    })

    it('rejects a missing root entity id', () => {
      expect(() => normalizeRecord({ id: null, name: 'test' })).toThrow('id')
    })

    it('normalizes item and relation ids without touching protocol ids', () => {
      const result = normalizeRecord({
        id: '1',
        customerId: 7,
        traceId: 'trace-1',
        items: [
          {
            id: '2',
            materialId: 8,
            sourcePurchaseOrderItemId: '700520000000000001',
            name: 'a',
          },
        ],
      })
      expect(result.customerId).toBe('7')
      expect(result.traceId).toBe('trace-1')
      expect(result.items).toHaveLength(1)
      expect(result.items![0]).toMatchObject({
        id: '2',
        materialId: '8',
        sourcePurchaseOrderItemId: '700520000000000001',
      })
    })

    it('sets items to undefined when not an array', () => {
      const result = normalizeRecord({ id: '1' })
      expect(result.items).toBeUndefined()
    })

    it('rejects unsafe nested number ids', () => {
      expect(() =>
        normalizeRecord({
          id: '1',
          items: [
            { id: '2', warehouseId: Number.MAX_SAFE_INTEGER + 1, name: 'a' },
          ],
        }),
      ).toThrow('items[0].warehouseId')
    })
  })
})
