import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchGlobalDocuments, toGlobalSearchResult } from '@/api/global-search'
import { ENDPOINTS } from '@/constants/endpoints'

const { httpGetMock } = vi.hoisted(() => ({
  httpGetMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: <T extends { code?: number }>(response: T) => response,
  http: {
    get: httpGetMock,
  },
}))

describe('searchGlobalDocuments', () => {
  beforeEach(() => {
    httpGetMock.mockReset()
  })

  it('maps aggregate search results to stable option values with string track ids', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: [
        {
          moduleKey: 'purchase-order',
          title: '采购订单',
          trackId: '308251467645452288',
          primaryNo: 'PO2026000032',
          summary: '测试供应商',
          matchedByTrackId: false,
        },
      ],
    })

    const results = await searchGlobalDocuments('PO2026000032', [
      'purchase-order',
    ])

    expect(httpGetMock).toHaveBeenCalledWith(ENDPOINTS.GLOBAL_SEARCH, {
      signal: undefined,
      params: {
        keyword: 'PO2026000032',
        limit: 20,
        moduleKeys: 'purchase-order',
      },
    })
    expect(results).toEqual([
      {
        value: 'purchase-order::308251467645452288',
        label: '采购订单 | PO2026000032 | 测试供应商',
        moduleKey: 'purchase-order',
        title: '采购订单',
        trackId: '308251467645452288',
        primaryNo: 'PO2026000032',
        summary: '测试供应商',
        matchedByTrackId: false,
      },
    ])
  })
})

describe('toGlobalSearchResult', () => {
  it('appends trackId label when matchedByTrackId is true and differs from primaryNo', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '123',
      primaryNo: 'PO001',
      matchedByTrackId: true,
    })
    expect(result.label).toContain('| ID 123')
    expect(result.matchedByTrackId).toBe(true)
  })

  it('omits trackId label when matchedByTrackId is false', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: '123',
      primaryNo: 'PO001',
      matchedByTrackId: false,
    })
    expect(result.label).not.toContain('| ID')
  })

  it('omits trackId label when trackId equals primaryNo', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'purchase-order',
      title: '采购订单',
      trackId: 'PO001',
      primaryNo: 'PO001',
      matchedByTrackId: true,
    })
    expect(result.label).not.toContain('| ID')
  })

  it('appends summary when present', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'test',
      title: 'T',
      trackId: '1',
      summary: '备注信息',
    })
    expect(result.label).toContain('| 备注信息')
    expect(result.summary).toBe('备注信息')
  })

  it('omits summary section when empty', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'test',
      title: 'T',
      trackId: '1',
      summary: '',
    })
    expect(result.label).toBe('T | 1')
    expect(result.summary).toBe('')
  })

  it('falls back to moduleKey when title is missing', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'purchase-order',
      trackId: '1',
    })
    expect(result.title).toBe('purchase-order')
    expect(result.label).toContain('purchase-order')
  })

  it('falls back to trackId for primaryNo when primaryNo is missing', () => {
    const result = toGlobalSearchResult({
      moduleKey: 'test',
      title: 'T',
      trackId: 'abc123',
    })
    expect(result.primaryNo).toBe('abc123')
  })

  it('filters out result when moduleKey is empty', () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: [{ trackId: '1', primaryNo: 'P1' }],
    })
    const results = searchGlobalDocuments('k', ['test'])
    return results.then((r) => expect(r).toEqual([]))
  })

  it('filters out result when both trackId and primaryNo are empty', () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: [{ moduleKey: 'test', title: 'T' }],
    })
    const results = searchGlobalDocuments('k', ['test'])
    return results.then((r) => expect(r).toEqual([]))
  })

  it('handles all undefined fields gracefully', () => {
    const result = toGlobalSearchResult({})
    expect(result.moduleKey).toBe('')
    expect(result.title).toBe('')
    expect(result.trackId).toBe('')
    expect(result.primaryNo).toBe('')
    expect(result.summary).toBe('')
    expect(result.matchedByTrackId).toBe(false)
  })
})
