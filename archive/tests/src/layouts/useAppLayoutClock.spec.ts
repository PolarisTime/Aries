import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppLayoutClock } from '@/layouts/useAppLayoutClock'

describe('useAppLayoutClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a dayjs instance', () => {
    const { result } = renderHook(() => useAppLayoutClock())
    expect(result.current).toBeDefined()
    expect(typeof result.current.format).toBe('function')
  })

  it('updates every second', () => {
    const { result } = renderHook(() => useAppLayoutClock())
    const initial = result.current

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).not.toBe(initial)
  })

  it('clears interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const { unmount } = renderHook(() => useAppLayoutClock())

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
