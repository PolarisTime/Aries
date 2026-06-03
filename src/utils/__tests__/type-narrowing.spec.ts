import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { asArray, asId, asNumber, asString, safe } from '../type-narrowing'

describe('asString', () => {
  it('returns string as-is', () => {
    expect(asString('hello')).toBe('hello')
  })
  it('converts finite number', () => {
    expect(asString(42)).toBe('42')
  })
  it('converts Infinity to empty', () => {
    expect(asString(Infinity)).toBe('')
  })
  it('converts NaN to empty', () => {
    expect(asString(NaN)).toBe('')
  })
  it('converts boolean', () => {
    expect(asString(true)).toBe('true')
  })
  it('converts bigint', () => {
    expect(asString(42n)).toBe('42')
  })
  it('returns empty for object', () => {
    expect(asString({})).toBe('')
  })
  it('returns empty for null', () => {
    expect(asString(null)).toBe('')
  })
  it('returns empty for undefined', () => {
    expect(asString(undefined)).toBe('')
  })
})

describe('asNumber', () => {
  it('returns finite number as-is', () => {
    expect(asNumber(42)).toBe(42)
  })
  it('returns 0 for NaN', () => {
    expect(asNumber(NaN)).toBe(0)
  })
  it('returns 0 for Infinity', () => {
    expect(asNumber(Infinity)).toBe(0)
  })
  it('parses valid string', () => {
    expect(asNumber('42')).toBe(42)
  })
  it('returns 0 for invalid string', () => {
    expect(asNumber('abc')).toBe(0)
  })
  it('converts bigint', () => {
    expect(asNumber(42n)).toBe(42)
  })
  it('converts bigint overflow', () => {
    expect(asNumber(BigInt('9007199254740993'))).toBe(9007199254740993)
  })
  it('returns 0 for object', () => {
    expect(asNumber({})).toBe(0)
  })
  it('returns 0 for boolean', () => {
    expect(asNumber(true)).toBe(0)
  })
})

describe('asArray', () => {
  it('returns array as-is', () => {
    expect(asArray([1, 2])).toEqual([1, 2])
  })
  it('returns empty for non-array', () => {
    expect(asArray(null)).toEqual([])
  })
  it('returns empty for object', () => {
    expect(asArray({})).toEqual([])
  })
  it('returns empty for undefined', () => {
    expect(asArray(undefined)).toEqual([])
  })
})

describe('asId', () => {
  it('converts positive integer number', () => {
    expect(asId(42)).toBe('42')
  })
  it('returns empty for zero number', () => {
    expect(asId(0)).toBe('')
  })
  it('returns empty for negative number', () => {
    expect(asId(-1)).toBe('')
  })
  it('returns empty for non-integer number', () => {
    expect(asId(1.5)).toBe('')
  })
  it('converts positive bigint', () => {
    expect(asId(42n)).toBe('42')
  })
  it('returns empty for zero bigint', () => {
    expect(asId(0n)).toBe('')
  })
  it('converts valid numeric string', () => {
    expect(asId('42')).toBe('42')
  })
  it('trims valid numeric string', () => {
    expect(asId(' 42 ')).toBe('42')
  })
  it('returns empty for "0" string', () => {
    expect(asId('0')).toBe('')
  })
  it('returns empty for non-numeric string', () => {
    expect(asId('abc')).toBe('')
  })
  it('returns empty for null', () => {
    expect(asId(null)).toBe('')
  })
  it('returns empty for boolean', () => {
    expect(asId(true)).toBe('')
  })
})

describe('safe', () => {
  it('handles null/undefined record', () => {
    expect(safe(null).str('key')).toBe('')
    expect(safe(undefined).num('key')).toBe(0)
    expect(safe(null).bool('key')).toBe(false)
    expect(safe(undefined).arr('key')).toEqual([])
  })

  it('str returns value or fallback', () => {
    expect(safe({ name: 'test' }).str('name')).toBe('test')
    expect(safe({}).str('name', 'default')).toBe('default')
  })

  it('num returns value or fallback', () => {
    expect(safe({ qty: 42 }).num('qty')).toBe(42)
    expect(safe({}).num('qty', 10)).toBe(10)
  })

  it('bool returns value or fallback', () => {
    expect(safe({ active: true }).bool('active')).toBe(true)
    expect(safe({}).bool('active', true)).toBe(true)
  })

  it('arr returns value or fallback', () => {
    expect(safe({ items: [1, 2] }).arr('items')).toEqual([1, 2])
    expect(safe({}).arr('items', [3])).toEqual([3])
  })

  it('raw returns raw value', () => {
    expect(safe({ x: 1 }).raw('x')).toBe(1)
    expect(safe({}).raw('y')).toBeUndefined()
  })

  it('bool converts number values', () => {
    expect(safe({ val: 1 }).bool('val')).toBe(true)
    expect(safe({ val: 0 }).bool('val')).toBe(false)
    expect(safe({ val: 42 }).bool('val')).toBe(true)
    expect(safe({ val: -1 }).bool('val')).toBe(true)
  })

  it('bool returns false for null/undefined/object', () => {
    expect(safe({ val: null }).bool('val')).toBe(false)
    expect(safe({ val: undefined }).bool('val')).toBe(false)
    expect(safe({ val: {} }).bool('val')).toBe(false)
  })

  it('bool converts string "1" to true', () => {
    expect(safe({ val: '1' }).bool('val')).toBe(true)
    expect(safe({ val: 'false' }).bool('val')).toBe(false)
  })

  it('get parses value with Zod schema when key exists', () => {
    const schema = z.number()
    expect(safe({ qty: 42 }).get('qty', schema, 0)).toBe(42)
    expect(safe({ qty: 10 }).get('qty', schema, 0)).toBe(10)
  })

  it('get returns fallback when key is missing', () => {
    const schema = z.number()
    expect(safe({}).get('qty', schema, 99)).toBe(99)
  })

  it('get returns fallback when Zod parse fails', () => {
    const schema = z.number()
    expect(safe({ qty: 'not-a-number' }).get('qty', schema, 0)).toBe(0)
  })

  it('get parses complex Zod schema', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const valid = { name: 'Alice', age: 30 }
    expect(
      safe({ data: valid }).get('data', schema, { name: '', age: 0 }),
    ).toEqual(valid)
    expect(
      safe({ data: 'invalid' }).get('data', schema, { name: '', age: 0 }),
    ).toEqual({ name: '', age: 0 })
  })

  it('get parses string schema', () => {
    const schema = z.string()
    expect(safe({ name: 'hello' }).get('name', schema, '')).toBe('hello')
    expect(safe({ name: 42 }).get('name', schema, 'default')).toBe('default')
  })
})
