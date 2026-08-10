import { describe, expect, it } from 'vitest'
import { asArray, asId, asNumber, asString, safe } from '@/utils/type-narrowing'

describe('asString', () => {
  it('返回字符串原样', () => {
    expect(asString('abc')).toBe('abc')
  })

  it('有限数字转字符串', () => {
    expect(asString(42)).toBe('42')
    expect(asString(0)).toBe('0')
  })

  it('非有限数字返回空串', () => {
    expect(asString(Number.NaN)).toBe('')
    expect(asString(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('布尔与大整数转字符串', () => {
    expect(asString(true)).toBe('true')
    expect(asString(123n)).toBe('123')
  })

  it('null/undefined/对象返回空串', () => {
    expect(asString(null)).toBe('')
    expect(asString(undefined)).toBe('')
    expect(asString({ a: 1 })).toBe('')
    expect(asString(Symbol('x'))).toBe('')
  })
})

describe('asNumber', () => {
  it('有限数字原样返回', () => {
    expect(asNumber(3.14)).toBe(3.14)
    expect(asNumber(-5)).toBe(-5)
  })

  it('非有限数字返回 0', () => {
    expect(asNumber(Number.NaN)).toBe(0)
    expect(asNumber(Number.NEGATIVE_INFINITY)).toBe(0)
  })

  it('数字字符串解析', () => {
    expect(asNumber('42')).toBe(42)
    expect(asNumber('3.5')).toBe(3.5)
  })

  it('非数字字符串返回 0', () => {
    expect(asNumber('abc')).toBe(0)
    expect(asNumber('')).toBe(0)
    expect(asNumber('   ')).toBe(0)
  })

  it('bigint 转 number', () => {
    expect(asNumber(42n)).toBe(42)
  })

  it('null/undefined/对象返回 0', () => {
    expect(asNumber(null)).toBe(0)
    expect(asNumber(undefined)).toBe(0)
    expect(asNumber([])).toBe(0)
  })
})

describe('asArray', () => {
  it('数组原样返回', () => {
    expect(asArray([1, 2])).toEqual([1, 2])
  })

  it('非数组返回空数组', () => {
    expect(asArray(null)).toEqual([])
    expect(asArray(undefined)).toEqual([])
    expect(asArray('abc')).toEqual([])
    expect(asArray({ length: 2 })).toEqual([])
  })
})

describe('safe', () => {
  it('null 记录按空对象处理', () => {
    expect(safe(null).str('name')).toBe('')
  })

  it('读取存在的字段', () => {
    expect(safe({ name: '客户A', qty: 3 }).str('name')).toBe('客户A')
  })

  it('读取不存在的字段返回 fallback', () => {
    expect(safe({ name: 'x' }).str('missing', 'fallback')).toBe('fallback')
  })

  it('值非字符串时安全收窄', () => {
    expect(safe({ age: 30 }).str('age')).toBe('30')
    expect(safe({ flag: true }).str('flag')).toBe('true')
  })
})

describe('asId', () => {
  it('正整数 number 转字符串', () => {
    expect(asId(123)).toBe('123')
  })

  it('正整数 bigint 转字符串', () => {
    expect(asId(123n)).toBe('123')
  })

  it('正整数字符串保留', () => {
    expect(asId('123')).toBe('123')
    expect(asId('  456  ')).toBe('456')
  })

  it('零返回空串', () => {
    expect(asId(0)).toBe('')
    expect(asId('0')).toBe('')
    expect(asId(0n)).toBe('')
  })

  it('负数返回空串', () => {
    expect(asId(-1)).toBe('')
    expect(asId('-5')).toBe('')
  })

  it('非整数字符串/浮点返回空串', () => {
    expect(asId('abc')).toBe('')
    expect(asId('1.5')).toBe('')
    expect(asId(1.5)).toBe('')
  })

  it('null/undefined 返回空串', () => {
    expect(asId(null)).toBe('')
    expect(asId(undefined)).toBe('')
  })
})
