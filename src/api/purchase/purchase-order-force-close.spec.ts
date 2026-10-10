import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPostMock, apiDeleteNoContentMock, withIdempotencyKeyMock } =
  vi.hoisted(() => ({
    apiPostMock: vi.fn(),
    apiDeleteNoContentMock: vi.fn(),
    withIdempotencyKeyMock: vi.fn(() => ({
      headers: { 'X-Idempotency-Key': 'k' },
    })),
  }))

vi.mock('@/api/core/client', () => ({
  apiPost: apiPostMock,
  apiDeleteNoContent: apiDeleteNoContentMock,
}))

vi.mock('@/api/core/idempotency', () => ({
  withIdempotencyKey: withIdempotencyKeyMock,
}))

import {
  cancelPurchaseOrderForceClose,
  forceClosePurchaseOrder,
} from './purchase-order-force-close'

describe('采购订单强制结单 API', () => {
  beforeEach(() => {
    apiPostMock.mockReset().mockResolvedValue({})
    apiDeleteNoContentMock.mockReset().mockResolvedValue(undefined)
    withIdempotencyKeyMock.mockClear()
  })

  it('结单走子资源 POST 并携带原因与幂等键', async () => {
    await forceClosePurchaseOrder('363907829455855616', '剩余 1 件报废')

    expect(apiPostMock).toHaveBeenCalledTimes(1)
    const [url, , body, config] = apiPostMock.mock.calls[0]
    expect(url).toBe('/purchase-orders/363907829455855616/force-closures')
    expect(body).toEqual({ reason: '剩余 1 件报废' })
    expect(config).toBeDefined()
    expect(withIdempotencyKeyMock).toHaveBeenCalled()
  })

  it('撤销结单走同一个子资源的 DELETE 并携带幂等键', async () => {
    await cancelPurchaseOrderForceClose('363907829455855616')

    expect(apiDeleteNoContentMock).toHaveBeenCalledTimes(1)
    const [url, config] = apiDeleteNoContentMock.mock.calls[0]
    expect(url).toBe('/purchase-orders/363907829455855616/force-closures')
    expect(config).toBeDefined()
    expect(withIdempotencyKeyMock).toHaveBeenCalled()
  })

  it('路径 ID 按字符串传递, 不经过 Number 转换', async () => {
    await forceClosePurchaseOrder('363907829455855616', '整单作废')

    const [url] = apiPostMock.mock.calls[0]
    expect(url).toContain('363907829455855616')
    expect(url).not.toContain('e+')
  })
})
