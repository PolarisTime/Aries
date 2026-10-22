import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: vi.fn(),
  downloadGet: vi.fn(),
}))

import { ENDPOINTS } from '@/constants/endpoints'
import { EntityIdContractError } from '@/types/entity-id'
import {
  fetchPricingQuoteResolution,
  pricingQuoteResolutionSchema,
} from './pricing-quote-resolutions'

const PROJECT_ID = '1234567890123456789'

const resolution = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  projectId: PROJECT_ID,
  basis: 'ORDER',
  offsetDays: 2,
  priceClosedSettleDirection: 'NEXT',
  priceClosedSettleDays: 0,
  periodPolicy: 'AUTO',
  requestedPeriod: null,
  targetDate: '2026-10-09',
  targetIsTradingDay: true,
  quoteDate: '2026-10-13',
  period: '中午',
  quoteAvailable: true,
  suggestedDate: null,
  explanation: '报单日期 2026-10-09 为交易日, 取之后第 2 个交易日 2026-10-13',
  dateFallback: null,
  periodFallback: {
    applied: true,
    from: '下午',
    to: '中午',
    reason: '当日没有「下午」行情, 已按可用时段「中午」取价',
  },
  availablePeriods: ['上午', '中午'],
  ...overrides,
})

describe('fetchPricingQuoteResolution', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue(resolution())
  })

  it('按项目 id 拼装路径(雪花 ID 原样字符串)', async () => {
    await fetchPricingQuoteResolution(PROJECT_ID, {
      orderDate: '2026-10-09',
      deliveryDate: '2026-10-15',
      basis: 'ORDER',
      offsetDays: 2,
      priceClosedSettleDirection: 'NEXT',
      priceClosedSettleDays: 3,
      periodPolicy: 'FIXED',
      period: '下午',
      quoteDate: '2026-10-13',
    })

    expect(apiGetMock.mock.calls[0][0]).toBe(
      ENDPOINTS.PROJECT_PRICING_QUOTE_RESOLUTIONS(PROJECT_ID),
    )
    expect(apiGetMock.mock.calls[0][0]).toBe(
      `/projects/${PROJECT_ID}/pricing-quote-resolutions`,
    )
  })

  it('单据日期与覆盖参数原样透传', async () => {
    const signal = new AbortController().signal

    await fetchPricingQuoteResolution(
      PROJECT_ID,
      {
        orderDate: '2026-10-09',
        deliveryDate: '2026-10-15',
        basis: 'ORDER',
        offsetDays: 3,
        priceClosedSettleDirection: 'PREV',
        priceClosedSettleDays: 2,
        periodPolicy: 'FIXED',
        period: '下午',
        quoteDate: '2026-10-13',
      },
      signal,
    )

    const [, , config] = apiGetMock.mock.calls[0]
    expect(config.params).toEqual({
      orderDate: '2026-10-09',
      deliveryDate: '2026-10-15',
      basis: 'ORDER',
      offsetDays: 3,
      priceClosedSettleDirection: 'PREV',
      priceClosedSettleDays: 2,
      periodPolicy: 'FIXED',
      period: '下午',
      quoteDate: '2026-10-13',
    })
    expect(config.signal).toBe(signal)
  })

  it('未传参数时不携带任何覆盖键(后端按项目配置解析)', async () => {
    await fetchPricingQuoteResolution(PROJECT_ID)

    const [, , config] = apiGetMock.mock.calls[0]
    expect(config.params).toEqual({})
    expect(config.signal).toBeUndefined()
  })

  it('非法项目 id 直接失败关闭, 不发请求', () => {
    expect(() => fetchPricingQuoteResolution('0', {})).toThrow(
      EntityIdContractError,
    )
    expect(apiGetMock).not.toHaveBeenCalled()
  })

  it('解析失败原因原样向上抛(422 ProblemDetail 文案不吞)', async () => {
    const failure = new Error('按报单日期取价需要提供报单日期')
    apiGetMock.mockRejectedValue(failure)

    await expect(
      fetchPricingQuoteResolution(PROJECT_ID, { orderDate: '2026-10-09' }),
    ).rejects.toThrow('按报单日期取价需要提供报单日期')
  })
})

describe('pricingQuoteResolutionSchema', () => {
  it('解析完整响应(含时段回退与可用时段)', () => {
    const parsed = pricingQuoteResolutionSchema.parse(resolution())

    expect(parsed.basis).toBe('ORDER')
    expect(parsed.offsetDays).toBe(2)
    expect(parsed.priceClosedSettleDirection).toBe('NEXT')
    expect(parsed.priceClosedSettleDays).toBe(0)
    expect(parsed.quoteDate).toBe('2026-10-13')
    expect(parsed.period).toBe('中午')
    expect(parsed.quoteAvailable).toBe(true)
    expect(parsed.periodFallback?.applied).toBe(true)
    expect(parsed.periodFallback?.reason).toContain('下午')
    expect(parsed.availablePeriods).toEqual(['上午', '中午'])
  })

  it('可空字段为 null / 缺省时均可解析', () => {
    const parsed = pricingQuoteResolutionSchema.parse({
      projectId: PROJECT_ID,
      basis: 'MANUAL',
      offsetDays: 0,
      priceClosedSettleDirection: 'PREV',
      priceClosedSettleDays: 1,
      periodPolicy: 'MANUAL',
      requestedPeriod: null,
      targetDate: '2026-10-11',
      targetIsTradingDay: false,
      quoteDate: '2026-10-11',
      period: null,
      quoteAvailable: false,
      suggestedDate: null,
      explanation: null,
      dateFallback: { applied: false, from: null, to: null, reason: null },
      periodFallback: null,
    })

    expect(parsed.period).toBeNull()
    expect(parsed.quoteAvailable).toBe(false)
    expect(parsed.periodFallback).toBeNull()
    expect(parsed.availablePeriods).toBeUndefined()
  })

  it('projectId 为数值时被拒（响应雪花 ID 必须为十进制字符串）', () => {
    // 9007199254740991 是 Number.MAX_SAFE_INTEGER：数值形式即使「安全」也不能被接受，
    // 否则数值雪花 ID 会被固化进契约，19 位 id 转 Number 静默丢低位。
    expect(() =>
      pricingQuoteResolutionSchema.parse(
        resolution({ projectId: 9007199254740991 }),
      ),
    ).toThrow()

    // 真实线上形态：后端把 19 位雪花 ID 输出成 JSON number，JSON.parse 已经丢过精度。
    const wireWithNumericId = JSON.parse(
      '{"projectId":1234567890123456789}',
    ) as { projectId: number }
    expect(() =>
      pricingQuoteResolutionSchema.parse(
        resolution({ projectId: wireWithNumericId.projectId }),
      ),
    ).toThrow()

    expect(() =>
      pricingQuoteResolutionSchema.parse(resolution({ projectId: 1 })),
    ).toThrow()
  })

  it('projectId 为 19 位十进制字符串时原样保留（不经过 Number）', () => {
    const parsed = pricingQuoteResolutionSchema.parse(
      resolution({ projectId: '9223372036854775806' }),
    )

    expect(parsed.projectId).toBe('9223372036854775806')
    expect(typeof parsed.projectId).toBe('string')
  })

  it('projectId 非法字符串（0/负数/非数字/空）被拒', () => {
    for (const projectId of ['0', '-1', 'abc', '123abc', '']) {
      expect(
        () => pricingQuoteResolutionSchema.parse(resolution({ projectId })),
        `projectId=${JSON.stringify(projectId)} 应被拒`,
      ).toThrow()
    }
  })

  it('projectId 超出 Long 上界的字符串被拒', () => {
    // Long.MAX_VALUE = 9223372036854775807，超一位即越界。
    expect(() =>
      pricingQuoteResolutionSchema.parse(
        resolution({ projectId: '9223372036854775808' }),
      ),
    ).toThrow()

    expect(
      pricingQuoteResolutionSchema.parse(
        resolution({ projectId: '9223372036854775807' }),
      ).projectId,
    ).toBe('9223372036854775807')
  })

  it('缺必需字段时契约校验失败', () => {
    const { quoteAvailable: _quoteAvailable, ...incomplete } = resolution()

    expect(() => pricingQuoteResolutionSchema.parse(incomplete)).toThrow()
  })
})
