import { describe, expect, it, vi } from 'vitest'
import { cloneLineItems } from '../clone-utils'

describe('cloneLineItems', () => {
  it('returns empty array for non-array input', () => {
    expect(cloneLineItems(null)).toEqual([])
    expect(cloneLineItems(undefined)).toEqual([])
    expect(cloneLineItems('string')).toEqual([])
    expect(cloneLineItems({})).toEqual([])
    expect(cloneLineItems(42)).toEqual([])
  })

  it('clones items without prefix', () => {
    const items = [
      { id: '1', name: 'item1', quantity: 10 },
      { id: '2', name: 'item2', quantity: 20 },
    ]
    const result = cloneLineItems(items)
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
    expect(result[0]).not.toBe(items[0])
  })

  it('clones items with prefix and generates new IDs', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000000)

    const items = [
      { id: 'old-1', name: 'item1' },
      { id: 'old-2', name: 'item2' },
    ]
    const result = cloneLineItems(items, 'PO')

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('PO-1000000-1')
    expect(result[1].id).toBe('PO-1000000-2')
    expect(result[0].name).toBe('item1')
    expect(result[1].name).toBe('item2')

    vi.useRealTimers()
  })

  it('preserves extra fields when cloning with prefix', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2000000)

    const items = [{ id: '1', code: 'A001', quantity: 5, price: 100 }]
    const result = cloneLineItems(items, 'INV')

    expect(result[0].code).toBe('A001')
    expect(result[0].quantity).toBe(5)
    expect(result[0].price).toBe(100)
    expect(result[0].id).toBe('INV-2000000-1')

    vi.useRealTimers()
  })
})
