import { describe, expect, it } from 'vitest'
import {
  EntityIdContractError,
  parseEntityId,
  parseOptionalEntityId,
} from '@/types/entity-id'

describe('parseEntityId', () => {
  it('合法正整数字符串返回', () => {
    expect(parseEntityId('123')).toBe('123')
  })

  it('19 位雪花 ID 上界返回', () => {
    expect(parseEntityId('9223372036854775807')).toBe('9223372036854775807')
  })

  it('超 Long.MAX_VALUE 拒绝', () => {
    expect(() => parseEntityId('9223372036854775808')).toThrow(
      EntityIdContractError,
    )
  })

  it('零拒绝', () => {
    expect(() => parseEntityId('0')).toThrow(EntityIdContractError)
  })

  it('前导零拒绝', () => {
    expect(() => parseEntityId('0123')).toThrow(EntityIdContractError)
  })

  it('负数拒绝', () => {
    expect(() => parseEntityId('-1')).toThrow(EntityIdContractError)
  })

  it('非数字字符串拒绝', () => {
    expect(() => parseEntityId('abc')).toThrow(EntityIdContractError)
    expect(() => parseEntityId('12.5')).toThrow(EntityIdContractError)
    expect(() => parseEntityId('')).toThrow(EntityIdContractError)
  })

  it('安全正整数 number 兼容转换为字符串', () => {
    expect(parseEntityId(123)).toBe('123')
  })

  it('不安全大整数 number 拒绝（精度丢失）', () => {
    // 2^53 超出 Number.MAX_SAFE_INTEGER，已丢失精度
    expect(() => parseEntityId(9007199254740992)).toThrow(EntityIdContractError)
  })

  it('浮点 number 拒绝', () => {
    expect(() => parseEntityId(1.5)).toThrow(EntityIdContractError)
  })

  it('零/负 number 拒绝', () => {
    expect(() => parseEntityId(0)).toThrow(EntityIdContractError)
    expect(() => parseEntityId(-5)).toThrow(EntityIdContractError)
  })

  it('null/undefined/对象拒绝', () => {
    expect(() => parseEntityId(null)).toThrow(EntityIdContractError)
    expect(() => parseEntityId(undefined)).toThrow(EntityIdContractError)
    expect(() => parseEntityId({ id: 1 })).toThrow(EntityIdContractError)
  })

  it('自定义字段名出现在错误信息', () => {
    try {
      parseEntityId('bad', 'customerId')
    } catch (e) {
      expect((e as EntityIdContractError).field).toBe('customerId')
    }
  })
})

describe('parseOptionalEntityId', () => {
  it('null/undefined 返回 undefined', () => {
    expect(parseOptionalEntityId(null)).toBeUndefined()
    expect(parseOptionalEntityId(undefined)).toBeUndefined()
  })

  it('合法值正常解析', () => {
    expect(parseOptionalEntityId('123')).toBe('123')
  })

  it('非法值拒绝', () => {
    expect(() => parseOptionalEntityId('abc')).toThrow(EntityIdContractError)
  })
})
