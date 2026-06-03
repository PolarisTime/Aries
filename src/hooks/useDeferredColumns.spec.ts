import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useDeferredColumns } from './useDeferredColumns'

describe('useDeferredColumns', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns all columns when count <= 5', () => {
    const columns = [
      { title: 'A', dataIndex: 'a' },
      { title: 'B', dataIndex: 'b' },
      { title: 'C', dataIndex: 'c' },
    ]
    const { result } = renderHook(() => useDeferredColumns(columns))
    expect(result.current).toEqual(columns)
  })

  it('returns first 5 columns initially when count > 5', () => {
    const columns = Array.from({ length: 10 }, (_, i) => ({
      title: `Col${i}`,
      dataIndex: `col${i}`,
    }))
    const { result } = renderHook(() => useDeferredColumns(columns))
    expect(result.current).toHaveLength(5)
  })

  it('expands to all columns after animation frame', () => {
    const columns = Array.from({ length: 10 }, (_, i) => ({
      title: `Col${i}`,
      dataIndex: `col${i}`,
    }))
    const { result } = renderHook(() => useDeferredColumns(columns))

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toHaveLength(10)
  })

  it('handles empty columns array', () => {
    const { result } = renderHook(() => useDeferredColumns([]))
    expect(result.current).toEqual([])
  })

  it('handles exactly 5 columns', () => {
    const columns = Array.from({ length: 5 }, (_, i) => ({
      title: `Col${i}`,
      dataIndex: `col${i}`,
    }))
    const { result } = renderHook(() => useDeferredColumns(columns))
    expect(result.current).toHaveLength(5)
  })

  it('handles exactly 6 columns', () => {
    const columns = Array.from({ length: 6 }, (_, i) => ({
      title: `Col${i}`,
      dataIndex: `col${i}`,
    }))
    const { result } = renderHook(() => useDeferredColumns(columns))
    expect(result.current).toHaveLength(5)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toHaveLength(6)
  })
})
