import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPutMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPut: apiPutMock,
  apiPatch: apiPatchMock,
}))

import {
  fetchQuoteProjectConfig,
  saveQuoteProjectConfig,
  updateQuoteProjectHrb400eFallback,
} from './quote-project-configs'

const configResponse = {
  projectId: '100000000000000001',
  lengthPremium: '30',
  hrb400eFallback: false,
  products: [],
  designatedBrands: [],
  brands: [],
  version: '2',
}

const configPayload = {
  lengthPremium: 30,
  hrb400eFallback: false,
  products: [],
  designatedBrands: [],
  brands: [],
}

function idempotencyKeyOf(config: unknown): string | undefined {
  return (config as { headers?: Record<string, string> } | undefined)
    ?.headers?.['X-Idempotency-Key']
}

describe('项目级比价配置保存的幂等键(X-Idempotency-Key)', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPutMock.mockReset()
    apiPatchMock.mockReset()
    apiGetMock.mockResolvedValue(configResponse)
    apiPutMock.mockResolvedValue(configResponse)
    apiPatchMock.mockResolvedValue({ ...configResponse, hrb400eFallback: true })
  })

  it('PUT 保存带非空幂等键, 并与版本头共存', async () => {
    await saveQuoteProjectConfig('100000000000000001', configPayload, '2')

    expect(apiPutMock).toHaveBeenCalledTimes(1)
    const [, , , config] = apiPutMock.mock.calls[0]
    expect(idempotencyKeyOf(config)).toBeTruthy()
    const captured = config as {
      headers: Record<string, string>
      suppressGlobalErrorStatuses?: readonly number[]
    }
    expect(captured.headers['X-Resource-Version']).toBe('2')
    // 不新增对 422 的全局提示抑制
    expect(captured.suppressGlobalErrorStatuses ?? []).not.toContain(422)
  })

  it('同一次用户动作内重试复用同一个 key', async () => {
    await saveQuoteProjectConfig(
      '100000000000000001',
      configPayload,
      '2',
      'config-action-key',
    )
    await saveQuoteProjectConfig(
      '100000000000000001',
      configPayload,
      '3',
      'config-action-key',
    )

    expect(idempotencyKeyOf(apiPutMock.mock.calls[0][3])).toBe(
      'config-action-key',
    )
    expect(idempotencyKeyOf(apiPutMock.mock.calls[1][3])).toBe(
      'config-action-key',
    )
  })

  it('GET 读取不带幂等键(只有写请求需要)', async () => {
    await fetchQuoteProjectConfig('100000000000000001')

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    const config = apiGetMock.mock.calls[0][2] as
      | { headers?: Record<string, string> }
      | undefined
    expect(idempotencyKeyOf(config)).toBeUndefined()
  })

  it('PATCH 切换 HRB400E 代取开关走独立端点并携带幂等键', async () => {
    const updated = await updateQuoteProjectHrb400eFallback(
      '100000000000000001',
      true,
    )

    expect(updated.hrb400eFallback).toBe(true)
    expect(apiPatchMock).toHaveBeenCalledTimes(1)
    const [url, , payload, config] = apiPatchMock.mock.calls[0]
    expect(url).toBe(
      '/quote-project-configs/100000000000000001/hrb400e-fallback',
    )
    expect(payload).toEqual({ hrb400eFallback: true })
    expect(idempotencyKeyOf(config)).toBeTruthy()
  })
})
