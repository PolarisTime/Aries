import { describe, expect, it, vi } from 'vitest'
import { buildTableResponse } from './business-listing-response'

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: vi.fn((key: string) => {
    const map: Record<string, string> = {
      resultIncomplete: '结果不完整',
    }
    return map[key] || key
  }),
}))

describe('buildTableResponse', () => {
  it('returns success response when not truncated', () => {
    const result = buildTableResponse([{ id: '1', name: 'test' }], 1, false)
    expect(result).toEqual({
      code: 0,
      message: undefined,
      data: {
        rows: [{ id: '1', name: 'test' }],
        total: 1,
        hasMore: undefined,
      },
    })
  })

  it('returns truncated response with message', () => {
    const result = buildTableResponse([{ id: '1' }], 50, true)
    expect(result.code).toBe(4000)
    expect(result.message).toContain('结果不完整')
    expect(result.message).toContain('2000')
  })

  it('passes hasMore flag', () => {
    const result = buildTableResponse([], 0, false, true)
    expect(result.data.hasMore).toBe(true)
  })

  it('defaults truncated to false', () => {
    const result = buildTableResponse([], 0)
    expect(result.code).toBe(0)
    expect(result.message).toBeUndefined()
  })
})
