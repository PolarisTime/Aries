import { describe, expect, it } from 'vitest'
import { normalizeRecord, normalizeRows } from '../normalizers'

describe('normalizeRecord', () => {
  it('normalizes record with id and items', () => {
    const raw = {
      id: 42,
      name: 'Test',
      items: [
        { lineNo: '1', product: 'A', quantity: 10 },
        { lineNo: '2', product: 'B', quantity: 20 },
      ],
    }
    const result = normalizeRecord(raw)
    expect(result.id).toBe('42')
    expect(result.name).toBe('Test')
    expect(result.items).toHaveLength(2)
    expect(result.items![0].id).toBe('1')
    expect(result.items![1].id).toBe('2')
  })

  it('normalizes record without items', () => {
    const raw = { id: '101' }
    const result = normalizeRecord(raw)
    expect(result.id).toBe('101')
    expect(result.items).toBeUndefined()
  })

  it('handles empty items array', () => {
    const raw = { id: '101', items: [] }
    const result = normalizeRecord(raw)
    expect(result.items).toBeUndefined()
  })

  it('normalizes record with string id', () => {
    const raw = { id: 'abc', name: 'test' }
    const result = normalizeRecord(raw)
    expect(result.id).toBe('abc')
  })

  it('strips items from top-level fields', () => {
    const raw = { id: '1', items: [{ lineNo: '1' }], status: 'active' }
    const result = normalizeRecord(raw)
    expect(result.status).toBe('active')
    expect(result.id).toBe('1')
  })

  it('sets id from lineNo when id is missing', () => {
    const raw = { id: '1', items: [{ lineNo: '10', product: 'X' }] }
    const result = normalizeRecord(raw)
    expect(result.items![0].id).toBe('10')
    expect(result.items![0].product).toBe('X')
  })

  it('normalizes line items preserving non-id/lineNo fields', () => {
    const raw = {
      id: '1',
      items: [
        {
          id: 'item-1',
          lineNo: '1',
          product: 'Steel',
          quantity: 100,
          price: 50,
        },
      ],
    }
    const result = normalizeRecord(raw)
    expect(result.items![0].id).toBe('item-1')
    expect(result.items![0].lineNo).toBe('1')
    expect(result.items![0].product).toBe('Steel')
    expect(result.items![0].quantity).toBe(100)
    expect(result.items![0].price).toBe(50)
  })

  it('handles line items with null id and lineNo', () => {
    const raw = {
      id: '1',
      items: [{ id: null, lineNo: null, product: 'A' }],
    }
    const result = normalizeRecord(raw)
    expect(result.items![0].id).toBe('')
    expect(result.items![0].lineNo).toBe('')
    expect(result.items![0].product).toBe('A')
  })

  it('handles record with numeric id', () => {
    const raw = { id: 42, name: 'test' }
    const result = normalizeRecord(raw)
    expect(result.id).toBe('42')
  })

  it('handles record with undefined items', () => {
    const raw = { id: '1', items: undefined }
    const result = normalizeRecord(raw)
    expect(result.items).toBeUndefined()
  })
})

describe('normalizeRows', () => {
  it('normalizes array of records', () => {
    const rows = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]
    const result = normalizeRows(rows)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('returns empty array for non-array input', () => {
    expect(normalizeRows(null)).toEqual([])
    expect(normalizeRows(undefined)).toEqual([])
  })

  it('handles empty array', () => {
    expect(normalizeRows([])).toEqual([])
  })

  it('normalizes rows with items', () => {
    const rows = [
      { id: '1', items: [{ lineNo: '1', product: 'A' }] },
      { id: '2', items: [{ lineNo: '2', product: 'B' }] },
    ]
    const result = normalizeRows(rows)
    expect(result).toHaveLength(2)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items![0].product).toBe('A')
  })

  it('handles non-object array elements gracefully', () => {
    const rows = [42, 'string']
    const result = normalizeRows(rows)
    expect(result).toHaveLength(2)
  })
})
