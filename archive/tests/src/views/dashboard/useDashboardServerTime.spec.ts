import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockUsePageVisibility = vi.fn()

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => mockUsePageVisibility(),
}))

import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

describe('useDashboardServerTime', () => {
  beforeEach(() => {
    mockUsePageVisibility.mockReturnValue(true)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('returns dash when synced serverTime becomes empty', () => {
    const { result, rerender } = renderHook(
      ({ serverTime }: { serverTime?: string | null }) =>
        useDashboardServerTime(serverTime),
      {
        initialProps: {
          serverTime: '2024-01-01T12:00:00Z',
        },
      },
    )

    expect(result.current).toMatch(/2024-01-01/)

    rerender({ serverTime: null })

    expect(result.current).toBe('—')
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

  it('does not tick while the page is hidden', () => {
    mockUsePageVisibility.mockReturnValue(false)
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    const { result } = renderHook(() =>
      useDashboardServerTime('2024-01-01T12:00:00Z'),
    )

    expect(result.current).toMatch(/2024-01-01/)
    expect(setIntervalSpy).not.toHaveBeenCalled()
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
