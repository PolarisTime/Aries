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

import { listAllStatementCandidates, listStatementCandidatePage, normalizeRecord } from './statements'

describe('statements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
    getModuleConfigMock.mockReturnValue({ path: '/supplier-statements' })
    pageContentMock.mockImplementation((data: { content?: unknown[] }) => data.content || [])
    pageTotalElementsMock.mockImplementation((data: { totalElements?: number }) => data.totalElements || 0)
  })

  describe('listAllStatementCandidates', () => {
    it('fetches all candidates in single page', async () => {
      const rows = [{ id: '1', name: 'item1' }]
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: rows, totalElements: 1 },
      })

      const result = await listAllStatementCandidates('supplier-statement', '', 200, {})

      expect(getModuleConfigMock).toHaveBeenCalledWith('supplier-statement')
      expect(httpGetMock).toHaveBeenCalledWith(
        '/supplier-statements/candidate',
        { params: { keyword: '', page: 0, size: 200 } },
      )
      expect(result).toHaveLength(1)
    })

    it('paginates when total exceeds page size', async () => {
      const page1Rows = Array.from({ length: 2 }, (_, i) => ({ id: String(i + 1) }))
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

      const result = await listAllStatementCandidates('supplier-statement', '', 2, {})

      expect(httpGetMock).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(3)
    })

    it('passes filters to request', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { content: [], totalElements: 0 },
      })

      await listAllStatementCandidates('supplier-statement', 'test', 200, { status: '启用' })

      expect(httpGetMock).toHaveBeenCalledWith(
        '/supplier-statements/candidate',
        { params: { keyword: 'test', page: 0, size: 200, status: '启用' } },
      )
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
    it('uses asId for id when available', () => {
      const result = normalizeRecord({ id: '123', name: 'test' })
      expect(result.id).toBe('123')
    })

    it('falls back to asString when asId returns empty', () => {
      const result = normalizeRecord({ id: null, name: 'test' })
      expect(result.id).toBe('')
    })

    it('normalizes items array ids', () => {
      const result = normalizeRecord({
        id: '1',
        items: [{ id: 'item-1', name: 'a' }, { id: 'item-2', name: 'b' }],
      })
      expect(result.items).toHaveLength(2)
      expect(result.items![0].id).toBe('item-1')
      expect(result.items![1].id).toBe('item-2')
    })

    it('sets items to undefined when not an array', () => {
      const result = normalizeRecord({ id: '1' })
      expect(result.items).toBeUndefined()
    })

    it('normalizes item id fallback', () => {
      const result = normalizeRecord({
        id: '1',
        items: [{ id: null, name: 'a' }],
      })
      expect(result.items![0].id).toBe('')
    })
  })
})
