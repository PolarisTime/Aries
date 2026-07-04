import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'

const { matchMediaMock, setAttributeMock } = vi.hoisted(() => ({
  matchMediaMock: vi.fn(),
  setAttributeMock: vi.fn(),
}))

import { useThemeMode } from './useThemeMode'

describe('useThemeMode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    useUiSettingsStore.setState({ settings: null })
    useUiSettingsStore.persist.clearStorage()
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })

    Object.defineProperty(document.documentElement, 'setAttribute', {
      writable: true,
      value: setAttributeMock,
    })
  })

  it('initializes with system theme by default', () => {
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.themeMode).toBe('system')
  })

  it('initializes with stored theme mode', () => {
    useUiSettingsStore.setState({ settings: { themeMode: 'dark' } })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.themeMode).toBe('dark')
  })

  it('resolves to light when system theme is light', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('resolves to dark when system theme is dark', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('resolves to dark when themeMode is dark', () => {
    useUiSettingsStore.setState({ settings: { themeMode: 'dark' } })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('resolves to light when themeMode is light', () => {
    useUiSettingsStore.setState({ settings: { themeMode: 'light' } })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('sets theme mode and persists to storage', () => {
    useUiSettingsStore.setState({ settings: { fontSize: 14 } })
    const { result } = renderHook(() => useThemeMode())

    act(() => {
      result.current.setThemeMode('dark')
    })

    expect(result.current.themeMode).toBe('dark')
    expect(useUiSettingsStore.getState().settings).toEqual({
      fontSize: 14,
      themeMode: 'dark',
    })
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toContain(
      'dark',
    )
  })

  it('applies data-theme attribute on mount', () => {
    renderHook(() => useThemeMode())
    expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'light')
  })

  it('applies data-theme attribute when resolved theme changes', () => {
    useUiSettingsStore.setState({ settings: { themeMode: 'light' } })
    const { result } = renderHook(() => useThemeMode())

    act(() => {
      result.current.setThemeMode('dark')
    })

    expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('listens for system theme changes', () => {
    const addEventListener = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener: vi.fn(),
    })

    renderHook(() => useThemeMode())
    expect(addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('updates resolved theme when the system theme changes', () => {
    let changeHandler: ((event: { matches: boolean }) => void) | undefined
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn((_event, handler) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
    })

    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('light')

    act(() => {
      changeHandler?.({ matches: true })
    })

    expect(result.current.resolvedTheme).toBe('dark')
    expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark')

    act(() => {
      changeHandler?.({ matches: false })
    })

    expect(result.current.resolvedTheme).toBe('light')
    expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'light')
  })

  it('removes listener on unmount', () => {
    const removeEventListener = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener,
    })

    const { unmount } = renderHook(() => useThemeMode())
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('listens for storage events', () => {
    const addEventListener = vi.fn()
    vi.spyOn(window, 'addEventListener').mockImplementation(addEventListener)

    renderHook(() => useThemeMode())
    expect(addEventListener).toHaveBeenCalledWith(
      'storage',
      expect.any(Function),
    )
  })

  it('ignores unrelated storage events', () => {
    let storageHandler: ((event: StorageEvent) => void) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event, handler) => {
        if (event === 'storage') {
          storageHandler = handler as (event: StorageEvent) => void
        }
      },
    )

    const { result } = renderHook(() => useThemeMode())

    act(() => {
      storageHandler?.(new StorageEvent('storage', { key: 'other-key' }))
    })

    expect(result.current.themeMode).toBe('system')
  })

  it('syncs theme mode from personal settings storage events', () => {
    let storageHandler: ((event: StorageEvent) => void) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event, handler) => {
        if (event === 'storage') {
          storageHandler = handler as (event: StorageEvent) => void
        }
      },
    )

    const { result } = renderHook(() => useThemeMode())
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        state: { settings: { themeMode: 'dark' } },
        version: 1,
      }),
    )

    act(() => {
      storageHandler?.(
        new StorageEvent('storage', { key: STORAGE_KEYS.personalSettings }),
      )
    })

    expect(result.current.themeMode).toBe('dark')
  })

  it('falls back to system when personal settings storage has no theme mode', () => {
    let storageHandler: ((event: StorageEvent) => void) | undefined
    useUiSettingsStore.setState({ settings: { themeMode: 'light' } })
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event, handler) => {
        if (event === 'storage') {
          storageHandler = handler as (event: StorageEvent) => void
        }
      },
    )

    const { result } = renderHook(() => useThemeMode())
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        state: { settings: {} },
        version: 1,
      }),
    )

    act(() => {
      storageHandler?.(
        new StorageEvent('storage', { key: STORAGE_KEYS.personalSettings }),
      )
    })

    expect(result.current.themeMode).toBe('system')
  })

  it('creates personal settings when setting theme mode without existing settings', () => {
    const { result } = renderHook(() => useThemeMode())

    act(() => {
      result.current.setThemeMode('light')
    })

    expect(useUiSettingsStore.getState().settings).toEqual({
      themeMode: 'light',
    })
  })

  it('removes storage listener on unmount', () => {
    const removeEventListener = vi.fn()
    vi.spyOn(window, 'removeEventListener').mockImplementation(
      removeEventListener,
    )

    const { unmount } = renderHook(() => useThemeMode())
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith(
      'storage',
      expect.any(Function),
    )
  })

  it('falls back safely when browser globals are unavailable', async () => {
    const browserGlobals = globalThis as Record<string, unknown>
    const originalWindow = browserGlobals.window
    const originalDocument = browserGlobals.document
    const useEffectMock = vi.fn(
      (effect: () => undefined | (() => void), deps?: readonly unknown[]) => {
        if (deps?.[0] === 'light') {
          effect()
        }
      },
    )

    try {
      vi.resetModules()
      delete browserGlobals.window
      delete browserGlobals.document
      vi.doMock('react', () => ({
        useEffect: useEffectMock,
        useState: vi.fn((initial: unknown) => [
          typeof initial === 'function'
            ? (initial as () => unknown)()
            : initial,
          vi.fn(),
        ]),
      }))
      vi.doMock('@/stores/uiSettingsStore', () => {
        const fakeState = {
          settings: { themeMode: 'system' },
          setThemeMode: vi.fn(),
        }
        const useStore = vi.fn((selector) => selector(fakeState))
        useStore.persist = { rehydrate: vi.fn() }
        return { useUiSettingsStore: useStore }
      })

      const { useThemeMode: useThemeModeWithoutBrowser } = await import(
        './useThemeMode'
      )

      expect(useThemeModeWithoutBrowser().resolvedTheme).toBe('light')
      expect(useEffectMock).toHaveBeenCalled()
    } finally {
      browserGlobals.window = originalWindow
      browserGlobals.document = originalDocument
      vi.doUnmock('react')
      vi.doUnmock('@/stores/uiSettingsStore')
      vi.resetModules()
    }
  })
})
