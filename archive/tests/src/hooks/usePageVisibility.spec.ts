import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePageVisibility } from './usePageVisibility'

describe('usePageVisibility', () => {
  const originalVisibilityState = document.visibilityState

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: originalVisibilityState,
      writable: true,
    })
  })

  it('returns true when page is visible', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(true)
  })

  it('returns false when page is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(false)
  })

  it('syncs when visibility and focus events fire', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(true)

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(false)

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBe(true)
  })

  it('removes event listeners on unmount', () => {
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => usePageVisibility())

    unmount()

    expect(removeDocumentListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    )
    expect(removeWindowListener).toHaveBeenCalledWith(
      'focus',
      expect.any(Function),
    )
    expect(removeWindowListener).toHaveBeenCalledWith(
      'blur',
      expect.any(Function),
    )
  })

  it('uses safe fallbacks when document and window are unavailable', async () => {
    const originalDocument = globalThis.document
    const originalWindow = globalThis.window
    const snapshots: unknown[] = []
    const cleanups: unknown[] = []

    vi.resetModules()
    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react')
      return {
        ...actual,
        useSyncExternalStore: (
          subscribe: (callback: () => void) => () => void,
          getSnapshot: () => unknown,
          getServerSnapshot: () => unknown,
        ) => {
          cleanups.push(subscribe(vi.fn()))
          snapshots.push(getSnapshot(), getServerSnapshot())
          return getSnapshot()
        },
      }
    })

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    })

    const { usePageVisibility: usePageVisibilityWithoutDom } = await import(
      './usePageVisibility'
    )

    expect(usePageVisibilityWithoutDom()).toBe(true)
    expect(cleanups).toHaveLength(1)
    expect((cleanups[0] as () => undefined)()).toBeUndefined()
    expect(snapshots).toEqual([true, true])

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    })
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    })
    vi.doUnmock('react')
    vi.resetModules()
  })
})
