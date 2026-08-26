import { describe, expect, it } from 'vitest'
import { buildSharedRouterOptions } from '@/router/router-options'

describe('buildSharedRouterOptions', () => {
  it('保留雪花 ID 查询参数为字符串，避免路由层发生精度丢失', () => {
    const options = buildSharedRouterOptions()
    const parsed = options.parseSearch?.(
      '?sourceRecordId=350692799655452672&create=1',
    )

    expect(parsed).toEqual({
      sourceRecordId: '350692799655452672',
      create: '1',
    })

    expect(
      options.stringifySearch?.({
        sourceRecordId: '350692799655452672',
        create: '1',
      }),
    ).toBe('?sourceRecordId=350692799655452672&create=1')
  })

  it('不会让特殊查询键修改解析对象原型', () => {
    const parsed = buildSharedRouterOptions().parseSearch?.(
      '?__proto__[polluted]=1&constructor=ok',
    )

    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
    expect(parsed?.constructor).toBe('ok')
  })
})
