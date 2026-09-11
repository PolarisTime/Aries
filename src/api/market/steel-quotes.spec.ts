import { describe, expect, it } from 'vitest'
import { materialPriceMatchSchema } from './steel-quotes'

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
