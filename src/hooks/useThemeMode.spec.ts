import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { getPersonalSettingsMock, setPersonalSettingsMock, matchMediaMock,
  setAttributeMock } = vi.hoisted(() => ({
  getPersonalSettingsMock: vi.fn(),
  setPersonalSettingsMock: vi.fn(),
  matchMediaMock: vi.fn(),
  setAttributeMock: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({
  getPersonalSettings: getPersonalSettingsMock,
  setPersonalSettings: setPersonalSettingsMock,
}))

import { useThemeMode } from './useThemeMode'

describe('useThemeMode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getPersonalSettingsMock.mockReturnValue({ themeMode: 'system' })
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
    getPersonalSettingsMock.mockReturnValue({ themeMode: 'dark' })
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
    getPersonalSettingsMock.mockReturnValue({ themeMode: 'dark' })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('resolves to light when themeMode is light', () => {
    getPersonalSettingsMock.mockReturnValue({ themeMode: 'light' })
    const { result } = renderHook(() => useThemeMode())
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('sets theme mode and persists to storage', () => {
    getPersonalSettingsMock.mockReturnValue({ fontSize: 14 })
    const { result } = renderHook(() => useThemeMode())
    
    act(() => {
      result.current.setThemeMode('dark')
    })

    expect(result.current.themeMode).toBe('dark')
    expect(setPersonalSettingsMock).toHaveBeenCalledWith({
      fontSize: 14,
      themeMode: 'dark',
    })
  })

  it('applies data-theme attribute on mount', () => {
    renderHook(() => useThemeMode())
    expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'light')
  })

  it('applies data-theme attribute when resolved theme changes', () => {
    getPersonalSettingsMock.mockReturnValue({ themeMode: 'light' })
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
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
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
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('listens for storage events', () => {
    const addEventListener = vi.fn()
    vi.spyOn(window, 'addEventListener').mockImplementation(addEventListener)

    renderHook(() => useThemeMode())
    expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('removes storage listener on unmount', () => {
    const removeEventListener = vi.fn()
    vi.spyOn(window, 'removeEventListener').mockImplementation(removeEventListener)

    const { unmount } = renderHook(() => useThemeMode())
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
  })
})
