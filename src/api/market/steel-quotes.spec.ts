import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPostMock, apiGetMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  downloadGet: vi.fn(),
}))

vi.mock('@/api/core/idempotency', () => ({
  withIdempotencyKey: () => ({ headers: {} }),
}))

import {
  fetchMaterialPriceMatches,
  materialPriceMatchSchema,
  syncSteelQuotes,
} from './steel-quotes'

describe('fetchMaterialPriceMatches 数据源', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue([])
  })

  it('透传 source/region 参数(西本按地区取价)', async () => {
    await fetchMaterialPriceMatches('2026-09-22', undefined, {
      source: 'STEELX',
      region: '杭州',
    })
    const [, , config] = apiGetMock.mock.calls[0]
    expect(config.params.source).toBe('STEELX')
    expect(config.params.region).toBe('杭州')
  })

  it('未指定时 source/region 为空', async () => {
    await fetchMaterialPriceMatches('2026-09-22', undefined, {})
    const [, , config] = apiGetMock.mock.calls[0]
    expect(config.params.source).toBeUndefined()
    expect(config.params.region).toBeUndefined()
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

describe('syncSteelQuotes 时段选择', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    apiPostMock.mockResolvedValue({
      articleDate: '2026-09-11',
      period: '下午',
      rowCount: 1,
      created: true,
    })
  })

  it('未指定时段时不携带 periods(后端按全部时段处理)', async () => {
    await syncSteelQuotes('2026-09-11')

    const [, , body] = apiPostMock.mock.calls[0]
    expect(body).toEqual({ date: '2026-09-11' })
  })

  it('指定时段时透传 periods', async () => {
    await syncSteelQuotes('2026-09-11', ['上午', '下午'])

    const [, , body] = apiPostMock.mock.calls[0]
    expect(body).toEqual({ date: '2026-09-11', periods: ['上午', '下午'] })
  })

  it('空时段数组退化为全部时段(不携带 periods)', async () => {
    await syncSteelQuotes('2026-09-11', [])

    const [, , body] = apiPostMock.mock.calls[0]
    expect(body).toEqual({ date: '2026-09-11' })
  })
})
