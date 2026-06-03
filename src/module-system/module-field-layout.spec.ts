import { describe, expect, it } from 'vitest'
import { groupFieldsByRow } from './module-field-layout'

describe('groupFieldsByRow', () => {
  it('returns empty array for empty fields', () => {
    expect(groupFieldsByRow([])).toEqual([])
  })

  it('groups fields when no explicit rows are set', () => {
    const fields = [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'd' },
      { key: 'e' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(4)
    expect(result[1]).toHaveLength(1)
  })

  it('puts fullRow field in its own row', () => {
    const fields = [
      { key: 'a' },
      { fullRow: true, key: 'b' },
      { key: 'c' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(3)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(1)
    expect(result[2]).toHaveLength(1)
  })

  it('puts textarea type field in its own row', () => {
    const fields = [
      { key: 'a' },
      { type: 'textarea', key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(1)
  })

  it('groups fields by explicit row values', () => {
    const fields = [
      { row: 2, key: 'c' },
      { row: 1, key: 'a' },
      { row: 1, key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([{ row: 1, key: 'a' }, { row: 1, key: 'b' }])
    expect(result[1]).toEqual([{ row: 2, key: 'c' }])
  })

  it('normalizes row values less than 1 to 1', () => {
    const fields = [
      { row: 0, key: 'a' },
      { row: -5, key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(2)
  })

  it('handles mixed explicit and implicit rows by using explicit', () => {
    const fields = [
      { key: 'a' },
      { row: 2, key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(1)
  })

  it('normalizes NaN row values to 1', () => {
    const fields = [
      { row: NaN, key: 'a' },
      { row: 1, key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(2)
  })

  it('normalizes non-integer row values by truncating', () => {
    const fields = [
      { row: 2.7, key: 'a' },
      { row: 1.3, key: 'b' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0][0].key).toBe('b')
    expect(result[1][0].key).toBe('a')
  })

  it('handles exactly 4 fields per row when no explicit rows', () => {
    const fields = [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'd' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(4)
  })

  it('handles 5 fields creating 2 rows when no explicit rows', () => {
    const fields = [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'd' },
      { key: 'e' },
    ]
    const result = groupFieldsByRow(fields)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(4)
    expect(result[1]).toHaveLength(1)
  })
})
