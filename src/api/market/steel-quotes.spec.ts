import { describe, expect, it } from 'vitest'
import { steelQuoteSyncResponseSchema } from './steel-quotes'

describe('steelQuoteSyncResponseSchema', () => {
  it('雪花 ID 以字符串返回时可正常解析', () => {
    const result = steelQuoteSyncResponseSchema.parse({
      articleId: '700500000000000129',
      articleUrl: 'https://example.com/a.html',
      articleDate: '2026-09-11',
      articleTime: '09:11',
      period: '上午',
      rowCount: 540,
      created: true,
    })
    expect(result.articleId).toBe('700500000000000129')
    expect(result.rowCount).toBe(540)
  })

  it('数字 ID 亦兼容', () => {
    const result = steelQuoteSyncResponseSchema.parse({
      articleId: 123,
      articleDate: '2026-09-11',
      period: '中午',
      rowCount: 0,
      created: false,
    })
    expect(result.articleId).toBe(123)
  })
})
