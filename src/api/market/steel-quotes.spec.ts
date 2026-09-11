import { describe, expect, it } from 'vitest'
import {
  steelQuotePageSchema,
  steelQuoteSyncResponseSchema,
} from './steel-quotes'

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

describe('steelQuotePageSchema', () => {
  it('totalElements 为字符串(long)时可解析', () => {
    const result = steelQuotePageSchema.parse({
      content: [
        {
          id: '700500000000000129',
          quoteDate: '2026-09-11',
          period: '上午',
          breed: '螺纹钢',
          spec: '12',
          material: 'HRB400',
          factory: '中天',
          price: 3320,
        },
      ],
      totalElements: '540',
      totalPages: 3,
      currentPage: 0,
      pageSize: 200,
      hasMore: true,
    })
    expect(result.totalElements).toBe('540')
    expect(result.content).toHaveLength(1)
  })
})
