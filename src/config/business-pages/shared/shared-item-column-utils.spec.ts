import { describe, expect, it } from 'vitest'
import {
  applyCompactItemLayout,
  insertColumnsAfter,
} from './shared-item-column-utils'

describe('insertColumnsAfter', () => {
  const baseColumns = [
    { title: 'A', dataIndex: 'a', width: 100 },
    { title: 'B', dataIndex: 'b', width: 100 },
    { title: 'C', dataIndex: 'c', width: 100 },
  ]

  it('inserts columns after matching dataIndex', () => {
    const result = insertColumnsAfter(baseColumns, 'a', [
      { title: 'X', dataIndex: 'x', width: 50 },
    ])
    expect(result).toHaveLength(4)
    expect(result[0].dataIndex).toBe('a')
    expect(result[1].dataIndex).toBe('x')
    expect(result[2].dataIndex).toBe('b')
  })

  it('appends to end when dataIndex not found', () => {
    const result = insertColumnsAfter(baseColumns, 'z', [
      { title: 'X', dataIndex: 'x', width: 50 },
    ])
    expect(result).toHaveLength(4)
    expect(result[3].dataIndex).toBe('x')
  })

  it('inserts multiple columns at once', () => {
    const result = insertColumnsAfter(baseColumns, 'b', [
      { title: 'X', dataIndex: 'x', width: 50 },
      { title: 'Y', dataIndex: 'y', width: 50 },
    ])
    expect(result).toHaveLength(5)
    expect(result[1].dataIndex).toBe('b')
    expect(result[2].dataIndex).toBe('x')
    expect(result[3].dataIndex).toBe('y')
    expect(result[4].dataIndex).toBe('c')
  })

  it('handles empty columns array', () => {
    const result = insertColumnsAfter([], 'a', [
      { title: 'X', dataIndex: 'x', width: 50 },
    ])
    expect(result).toEqual([{ title: 'X', dataIndex: 'x', width: 50 }])
  })
})

describe('applyCompactItemLayout', () => {
  const columns = [
    { title: 'A', dataIndex: 'a', width: 200 },
    { title: 'B', dataIndex: 'b', width: 100 },
    { title: 'C', dataIndex: 'c', width: 150 },
  ]

  it('applies width map to matching columns', () => {
    const result = applyCompactItemLayout(columns, { a: 100, b: 50 })
    expect(result[0].width).toBe(100)
    expect(result[1].width).toBe(50)
  })

  it('keeps original width for unmapped columns', () => {
    const result = applyCompactItemLayout(columns, { a: 100 })
    expect(result[2].width).toBe(150)
  })

  it('removes columns whose keys are in hiddenKeys', () => {
    const result = applyCompactItemLayout(columns, {}, ['b', 'c'])
    expect(result).toHaveLength(1)
    expect(result[0].dataIndex).toBe('a')
  })

  it('returns empty array when all columns are hidden', () => {
    const result = applyCompactItemLayout(columns, {}, ['a', 'b', 'c'])
    expect(result).toEqual([])
  })

  it('handles missing dataIndex in hiddenKeys gracefully', () => {
    const result = applyCompactItemLayout(columns, {}, ['nonexistent'])
    expect(result).toHaveLength(3)
  })
})
