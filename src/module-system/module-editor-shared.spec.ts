import { describe, expect, it } from 'vitest'
import {
  buildDefaultEditorLineItem,
  generatePlaceholderBatchNo,
  hasEditorValue,
  inferQuantityUnit,
  toRoundedNumber,
} from './module-editor-shared'

describe('hasEditorValue', () => {
  it('returns false for undefined', () => {
    expect(hasEditorValue(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(hasEditorValue(null)).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(hasEditorValue([])).toBe(false)
  })

  it('returns true for non-empty array', () => {
    expect(hasEditorValue([1])).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(hasEditorValue('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(hasEditorValue('   ')).toBe(false)
  })

  it('returns true for non-empty string', () => {
    expect(hasEditorValue('abc')).toBe(true)
  })

  it('returns true for number zero', () => {
    expect(hasEditorValue(0)).toBe(true)
  })

  it('returns true for false boolean', () => {
    expect(hasEditorValue(false)).toBe(true)
  })
})

describe('toRoundedNumber', () => {
  it('rounds a finite number to given precision', () => {
    expect(toRoundedNumber(1.2345, 2)).toBe(1.23)
  })

  it('returns 0 for non-finite value', () => {
    expect(toRoundedNumber(NaN, 2)).toBe(0)
  })

  it('returns 0 for Infinity', () => {
    expect(toRoundedNumber(Infinity, 2)).toBe(0)
  })

  it('returns 0 for string that cannot be parsed', () => {
    expect(toRoundedNumber('abc', 2)).toBe(0)
  })

  it('rounds a numeric string', () => {
    expect(toRoundedNumber('2.345', 2)).toBe(2.35)
  })
})

describe('inferQuantityUnit', () => {
  it('returns explicit quantityUnit when present', () => {
    expect(inferQuantityUnit({ quantityUnit: '箱' } as any)).toBe('箱')
  })

  it('returns 件 when record is null', () => {
    expect(inferQuantityUnit(null)).toBe('件')
  })

  it('returns 件 when record is undefined', () => {
    expect(inferQuantityUnit(undefined)).toBe('件')
  })

  it('returns 件 when quantityUnit is empty', () => {
    expect(inferQuantityUnit({ quantityUnit: '' } as any)).toBe('件')
  })

  it('returns 件 when quantityUnit is whitespace', () => {
    expect(inferQuantityUnit({ quantityUnit: '  ' } as any)).toBe('件')
  })
})

describe('generatePlaceholderBatchNo', () => {
  it('generates a non-empty uppercase string', () => {
    const result = generatePlaceholderBatchNo()
    expect(result).toBeTruthy()
    expect(result).toEqual(result.toUpperCase())
  })

  it('generates unique values on successive calls', () => {
    const a = generatePlaceholderBatchNo()
    const b = generatePlaceholderBatchNo()
    expect(a).not.toBe(b)
  })

  it('generates values in uppercase', () => {
    const result = generatePlaceholderBatchNo()
    expect(result).toBe(result.toUpperCase())
  })
})

describe('buildDefaultEditorLineItem', () => {
  it('creates item with default values when no itemId provided', () => {
    const item = buildDefaultEditorLineItem()
    expect(item.id).toBeTruthy()
    expect(item.materialCode).toBe('')
    expect(item.unit).toBe('吨')
    expect(item.quantityUnit).toBe('件')
    expect(item.quantity).toBe(0)
    expect(item.weightTon).toBe(0)
    expect(item.amount).toBe(0)
  })

  it('uses provided itemId', () => {
    const item = buildDefaultEditorLineItem('custom-id')
    expect(item.id).toBe('custom-id')
  })

  it('uses provided _moduleKey', () => {
    const item = buildDefaultEditorLineItem('id', 'purchase-order')
    expect(item.id).toBe('id')
    expect(item.materialCode).toBe('')
  })
})
