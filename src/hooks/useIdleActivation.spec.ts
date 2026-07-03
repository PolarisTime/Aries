import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdleActivation } from './useIdleActivation'

describe('useIdleActivation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when disabled', () => {
    const { result } = renderHook(() => useIdleActivation(false))
    expect(result.current).toBe(false)
  })

  it('returns false initially when enabled', () => {
    const { result } = renderHook(() => useIdleActivation(true))
    expect(result.current).toBe(false)
  })

  it('becomes active after timeout fallback', () => {
    const { result } = renderHook(() => useIdleActivation(true, 500))
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(true)
  })

  it('uses requestIdleCallback when available', () => {
    const mockRequestIdleCallback = vi.fn()
    const mockCancelIdleCallback = vi.fn()

    const origRequestIdleCallback = (window as any).requestIdleCallback
    const origCancelIdleCallback = (window as any).cancelIdleCallback

    Object.defineProperty(window, 'requestIdleCallback', {
      value: mockRequestIdleCallback,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: mockCancelIdleCallback,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useIdleActivation(true, 500))
    expect(mockRequestIdleCallback).toHaveBeenCalled()
    expect(result.current).toBe(false)

    const idleCallback = mockRequestIdleCallback.mock.calls[0][0]
    act(() => {
      idleCallback({ didTimeout: false, timeRemaining: () => 50 })
    })
    expect(result.current).toBe(true)

    if (origRequestIdleCallback === undefined) {
      delete (window as any).requestIdleCallback
    } else {
      Object.defineProperty(window, 'requestIdleCallback', {
        value: origRequestIdleCallback,
        writable: true,
        configurable: true,
      })
    }
    if (origCancelIdleCallback === undefined) {
      delete (window as any).cancelIdleCallback
    } else {
      Object.defineProperty(window, 'cancelIdleCallback', {
        value: origCancelIdleCallback,
        writable: true,
        configurable: true,
      })
    }
  })

  it('deactivates when enabled changes to false', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useIdleActivation(enabled, 100),
      { initialProps: { enabled: true } },
    )

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(true)

    act(() => {
      rerender({ enabled: false })
    })
    expect(result.current).toBe(false)
  })

  it('cleans up timer on unmount', () => {
    const { unmount } = renderHook(() => useIdleActivation(true, 500))
    unmount()
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
  })

  it('cleans up requestIdleCallback on unmount', () => {
    const mockCancelIdleCallback = vi.fn()
    const origCancelIdleCallback = (window as any).cancelIdleCallback

    Object.defineProperty(window, 'requestIdleCallback', {
      value: vi.fn().mockReturnValue(42),
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: mockCancelIdleCallback,
      writable: true,
      configurable: true,
    })

    const { unmount } = renderHook(() => useIdleActivation(true, 500))
    unmount()

    expect(mockCancelIdleCallback).toHaveBeenCalledWith(42)

    if (origCancelIdleCallback === undefined) {
      delete (window as any).cancelIdleCallback
    } else {
      Object.defineProperty(window, 'cancelIdleCallback', {
        value: origCancelIdleCallback,
        writable: true,
        configurable: true,
      })
    }
    delete (window as any).requestIdleCallback
  })

  it('allows missing cancelIdleCallback during requestIdleCallback cleanup', () => {
    Object.defineProperty(window, 'requestIdleCallback', {
      value: vi.fn().mockReturnValue(42),
      writable: true,
      configurable: true,
    })
    delete (window as any).cancelIdleCallback

    const { unmount } = renderHook(() => useIdleActivation(true, 500))

    expect(() => unmount()).not.toThrow()

    delete (window as any).requestIdleCallback
  })

  it('treats enabled state as active without browser globals', async () => {
    const browserGlobals = globalThis as Record<string, unknown>
    const originalWindow = browserGlobals.window
    const useEffectMock = vi.fn((effect: () => undefined | (() => void)) =>
      effect(),
    )

    try {
      vi.resetModules()
      delete browserGlobals.window
      vi.doMock('react', () => ({
        useEffect: useEffectMock,
        useState: vi.fn((initial: unknown) => [
          typeof initial === 'function'
            ? (initial as () => unknown)()
            : initial,
          vi.fn(),
        ]),
      }))

      const { useIdleActivation: useIdleActivationWithoutBrowser } =
        await import('./useIdleActivation')

      expect(useIdleActivationWithoutBrowser(true)).toBe(true)
      expect(useEffectMock).toHaveBeenCalled()
    } finally {
      browserGlobals.window = originalWindow
      vi.doUnmock('react')
      vi.resetModules()
    }
  })
})
