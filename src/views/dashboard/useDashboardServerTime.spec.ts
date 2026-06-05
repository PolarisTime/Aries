import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

describe('useDashboardServerTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns formatted time when serverTime is undefined', () => {
    const { result } = renderHook(() => useDashboardServerTime(undefined))
    expect(result.current).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('returns formatted time when serverTime is null', () => {
    const { result } = renderHook(() => useDashboardServerTime(null))
    expect(typeof result.current).toBe('string')
  })

  it('returns formatted time for valid serverTime', () => {
    const { result } = renderHook(() =>
      useDashboardServerTime('2024-01-01T12:00:00Z'),
    )
    expect(result.current).toMatch(/2024-01-01/)
  })

  it('returns original string for invalid serverTime', () => {
    const { result } = renderHook(() => useDashboardServerTime('invalid-date'))
    expect(result.current).toBe('invalid-date')
  })

  it('updates time periodically', () => {
    const { result } = renderHook(() =>
      useDashboardServerTime('2024-01-01T12:00:00Z'),
    )
    const initialTime = result.current
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).not.toBe(initialTime)
  })

  it('formats time correctly', () => {
    const { result } = renderHook(() =>
      useDashboardServerTime('2024-06-15T10:30:45Z'),
    )
    expect(result.current).toMatch(/2024-06-15/)
    expect(result.current).toMatch(/30:45/)
  })

  it('returns string type', () => {
    const { result } = renderHook(() =>
      useDashboardServerTime('2024-01-01T12:00:00Z'),
    )
    expect(typeof result.current).toBe('string')
  })
})
