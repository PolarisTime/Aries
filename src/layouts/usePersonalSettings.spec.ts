import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPersonalControlHeights,
  usePersonalSettings,
} from '@/layouts/usePersonalSettings'
import * as storage from '@/utils/storage'

vi.mock('@/utils/storage', () => ({
  getPersonalSettings: vi.fn(),
  setPersonalSettings: vi.fn(),
}))

describe('getPersonalControlHeights', () => {
  it('returns calculated heights based on font size', () => {
    const result = getPersonalControlHeights(14)
    expect(result).toEqual({
      controlHeight: 34,
      controlHeightSM: 26,
      controlHeightLG: 42,
    })
  })

  it('uses minimum height when font size is small', () => {
    const result = getPersonalControlHeights(8)
    expect(result).toEqual({
      controlHeight: 32,
      controlHeightSM: 24,
      controlHeightLG: 40,
    })
  })
})

describe('usePersonalSettings', () => {
  beforeEach(() => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue(null)
    vi.mocked(storage.setPersonalSettings).mockClear()
  })

  it('uses default settings when storage returns null', () => {
    const { result } = renderHook(() => usePersonalSettings())
    expect(result.current.fontSize).toBe(12)
    expect(result.current.layoutMode).toBe('top')
    expect(result.current.themeMode).toBe('system')
  })

  it('loads settings from storage', () => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue({
      fontSize: 16,
      layoutMode: 'sider',
      themeMode: 'dark',
    })

    const { result } = renderHook(() => usePersonalSettings())
    expect(result.current.fontSize).toBe(16)
    expect(result.current.layoutMode).toBe('sider')
    expect(result.current.themeMode).toBe('dark')
  })

  it('opens and closes modal', () => {
    const { result } = renderHook(() => usePersonalSettings())
    expect(result.current.visible).toBe(false)

    act(() => result.current.open())
    expect(result.current.visible).toBe(true)

    act(() => result.current.close())
    expect(result.current.visible).toBe(false)
  })

  it('reverts changes on close', () => {
    const { result } = renderHook(() => usePersonalSettings())

    act(() => result.current.open())
    act(() => result.current.setFontSize(18))
    act(() => result.current.setLayoutMode('sider'))

    act(() => result.current.close())

    expect(result.current.fontSize).toBe(12)
    expect(result.current.layoutMode).toBe('top')
  })

  it('resets to defaults', () => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue({
      fontSize: 16,
      layoutMode: 'sider',
      themeMode: 'dark',
    })

    const { result } = renderHook(() => usePersonalSettings())

    act(() => result.current.reset())

    expect(result.current.fontSize).toBe(12)
    expect(result.current.layoutMode).toBe('top')
    expect(result.current.themeMode).toBe('system')
  })

  it('saves settings to storage', () => {
    const { result } = renderHook(() => usePersonalSettings())

    act(() => result.current.setFontSize(14))
    act(() => result.current.setLayoutMode('sider'))
    act(() => result.current.setThemeMode('dark'))
    act(() => result.current.save())

    expect(storage.setPersonalSettings).toHaveBeenCalledWith({
      fontSize: 14,
      layoutMode: 'sider',
      themeMode: 'dark',
    })
    expect(result.current.appliedFontSize).toBe(14)
    expect(result.current.appliedLayoutMode).toBe('sider')
    expect(result.current.appliedThemeMode).toBe('dark')
  })

  it('loads settings from storage on load()', () => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue({
      fontSize: 18,
      layoutMode: 'sider',
      themeMode: 'light',
    })

    const { result } = renderHook(() => usePersonalSettings())

    act(() => result.current.load())

    expect(result.current.fontSize).toBe(18)
    expect(result.current.layoutMode).toBe('sider')
    expect(result.current.themeMode).toBe('light')
  })

  it('uses custom default values', () => {
    const { result } = renderHook(() =>
      usePersonalSettings({ defaultFontSize: 14, defaultLayoutMode: 'sider' }),
    )
    expect(result.current.fontSize).toBe(14)
    expect(result.current.layoutMode).toBe('sider')
  })

  it('normalizes invalid layout mode to default', () => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue({
      layoutMode: 'invalid' as any,
    })

    const { result } = renderHook(() => usePersonalSettings())
    expect(result.current.layoutMode).toBe('top')
  })

  it('normalizes invalid theme mode to system', () => {
    vi.mocked(storage.getPersonalSettings).mockReturnValue({
      themeMode: 'invalid' as any,
    })

    const { result } = renderHook(() => usePersonalSettings())
    expect(result.current.themeMode).toBe('system')
  })
})
