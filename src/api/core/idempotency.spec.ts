import { describe, expect, it } from 'vitest'
import { createIdempotencyKey, withIdempotencyKey } from './idempotency'

const IDEMPOTENCY_HEADER = 'X-Idempotency-Key'

type TestConfig = {
  headers?: Record<string, string>
  responseType?: 'json' | 'blob'
  suppressGlobalErrorStatuses?: readonly number[]
}

function keyOf(config: TestConfig | undefined): string | undefined {
  return config?.headers?.[IDEMPOTENCY_HEADER]
}

describe('withIdempotencyKey', () => {
  it('未传 key 时在请求创建期生成非空 key', () => {
    const config = withIdempotencyKey<TestConfig>()
    const key = keyOf(config)
    expect(typeof key).toBe('string')
    expect((key ?? '').length).toBeGreaterThan(0)
  })

  it('显式 key 优先, 并裁剪两侧空白', () => {
    const config = withIdempotencyKey<TestConfig>(undefined, '  action-key  ')
    expect(keyOf(config)).toBe('action-key')
  })

  it('调用方已设置幂等键头时不覆盖(重试复用同一 key)', () => {
    const config = withIdempotencyKey<TestConfig>(
      { headers: { [IDEMPOTENCY_HEADER]: 'existing-key' } },
      'another-key',
    )
    expect(keyOf(config)).toBe('existing-key')
  })

  it('透传扩展配置与既有 headers(供 ApiRequestConfig/下载请求复用)', () => {
    const config = withIdempotencyKey<TestConfig>(
      {
        headers: { Authorization: 'Bearer token' },
        responseType: 'blob',
        suppressGlobalErrorStatuses: [400, 422],
      },
      'export-key',
    )

    expect(keyOf(config)).toBe('export-key')
    expect(config.headers?.Authorization).toBe('Bearer token')
    expect(config.responseType).toBe('blob')
    expect(config.suppressGlobalErrorStatuses).toEqual([400, 422])
  })

  it('createIdempotencyKey 每次生成不同 key', () => {
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey())
  })
})
