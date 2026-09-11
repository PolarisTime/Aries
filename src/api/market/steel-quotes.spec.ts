import { describe, expect, it } from 'vitest'
import {
  materialPriceMatchSchema,
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
})

describe('materialPriceMatchSchema', () => {
  it('解析匹配结果(含字符串 basePrice / 雪花 materialId)', () => {
    const result = materialPriceMatchSchema.parse({
      materialId: '700500000000000130',
      materialCode: 'M001',
      brand: '万泰',
      material: 'HRB400E',
      category: '螺纹钢',
      spec: '12',
      length: '9米',
      status: '匹配',
      factory: '浙江万泰',
      matchedSpec: 'Φ12',
      singleSpecPrice: false,
      basePrice: '3290.00',
      price: '3320.00',
      quoteDate: '2026-09-11',
      period: '上午',
    })
    expect(result.basePrice).toBe('3290.00')
    expect(result.brand).toBe('万泰')
  })
})
