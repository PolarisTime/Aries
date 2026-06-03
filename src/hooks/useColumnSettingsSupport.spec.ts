import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getUserColumnSettingsMock,
  saveUserColumnSettingsMock,
  getListColumnSettingsMock,
  setListColumnSettingsMock,
  loggerWarnMock,
  messageWarningMock,
} = vi.hoisted(() => ({
  getUserColumnSettingsMock: vi.fn(),
  saveUserColumnSettingsMock: vi.fn(),
  getListColumnSettingsMock: vi.fn(),
  setListColumnSettingsMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  messageWarningMock: vi.fn(),
}))

vi.mock('@/api/user-preferences', () => ({
  getUserColumnSettings: getUserColumnSettingsMock,
  saveUserColumnSettings: saveUserColumnSettingsMock,
}))

vi.mock('@/utils/storage', () => ({
  getListColumnSettings: getListColumnSettingsMock,
  setListColumnSettings: setListColumnSettingsMock,
}))

vi.mock('@/utils/logger', () => ({
  logger: { warn: loggerWarnMock },
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: messageWarningMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

let authState: any = { user: { id: 'user-1', loginName: 'testuser' } }
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) => selector(authState),
}))

import { useColumnSettingsSupport } from './useColumnSettingsSupport'

describe('useColumnSettingsSupport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authState = { user: { id: 'user-1', loginName: 'testuser' } }
    getListColumnSettingsMock.mockReturnValue(null)
    getUserColumnSettingsMock.mockResolvedValue({ pages: {} })
    saveUserColumnSettingsMock.mockResolvedValue(undefined)
  })

  it('initializes with default state', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )
    expect(result.current.columnOrder).toEqual([])
    expect(result.current.columnVisibility).toEqual({})
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('sets loaded to true after mount for anonymous user', async () => {
    authState = { user: null }
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('loads remote settings on mount', async () => {
    getUserColumnSettingsMock.mockResolvedValue({
      pages: {
        'test-page': { orderedKeys: ['a', 'b'], hiddenKeys: ['c'] },
      },
    })

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.columnVisibility).toEqual({ c: false })
    expect(result.current.columnOrder).toEqual(['a', 'b'])
  })

  it('applies default hidden keys when no saved settings', async () => {
    getListColumnSettingsMock.mockReturnValue(null)
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', ['col-a', 'col-b'], 10),
    )
    expect(result.current.columnVisibility).toEqual({
      'col-a': false,
      'col-b': false,
    })
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('applies saved local settings', async () => {
    getListColumnSettingsMock.mockReturnValue({
      orderedKeys: ['x', 'y'],
      hiddenKeys: ['z'],
    })
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )
    expect(result.current.columnOrder).toEqual(['x', 'y'])
    expect(result.current.columnVisibility).toEqual({ z: false })
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('resets abnormal hidden keys from local storage', async () => {
    getListColumnSettingsMock.mockReturnValue({
      orderedKeys: [],
      hiddenKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    })
    renderHook(() => useColumnSettingsSupport('test-page', [], 10))
    expect(setListColumnSettingsMock).toHaveBeenCalledWith(
      'test-page',
      { orderedKeys: [], hiddenKeys: [] },
      'user-1',
    )
  })

  it('skips local storage read when totalColumnCount is 0', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', ['hidden-col'], 0),
    )
    expect(getListColumnSettingsMock).not.toHaveBeenCalled()
    expect(result.current.columnVisibility).toEqual({ 'hidden-col': false })
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('resets abnormal remote settings', async () => {
    getUserColumnSettingsMock.mockResolvedValue({
      pages: {
        'test-page': {
          orderedKeys: [],
          hiddenKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        },
      },
    })

    renderHook(() => useColumnSettingsSupport('test-page', [], 10))

    await waitFor(() =>
      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining('abnormal hiddenKeys'),
      ),
    )
  })

  it('handles remote load error gracefully', async () => {
    getUserColumnSettingsMock.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Failed to load roaming column settings',
      expect.any(Error),
    )
  })

  it('persists column order change', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange(['a', 'b', 'c'])
    })

    expect(result.current.columnOrder).toEqual(['a', 'b', 'c'])
    await waitFor(() => expect(saveUserColumnSettingsMock).toHaveBeenCalled())
  })

  it('persists column visibility change', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnVisibilityChange({ colA: false })
    })

    expect(result.current.columnVisibility).toEqual({ colA: false })
    await waitFor(() => expect(saveUserColumnSettingsMock).toHaveBeenCalled())
  })

  it('skips remote persist for anonymous user', async () => {
    authState = { user: null }

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange(['a'])
    })

    await waitFor(() => expect(setListColumnSettingsMock).toHaveBeenCalled())
    expect(saveUserColumnSettingsMock).not.toHaveBeenCalled()
  })

  it('skips persist when remote not loaded yet', async () => {
    getUserColumnSettingsMock.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    act(() => {
      result.current.handleColumnOrderChange(['a'])
    })

    expect(saveUserColumnSettingsMock).not.toHaveBeenCalled()
  })

  it('shows warning on persist failure', async () => {
    saveUserColumnSettingsMock.mockRejectedValue(new Error('Save failed'))

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange(['a'])
    })

    await waitFor(() => expect(messageWarningMock).toHaveBeenCalled())
  })

  it('uses anonymous userKey when user has no id or loginName', async () => {
    authState = { user: { userName: 'test' } }

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(getUserColumnSettingsMock).not.toHaveBeenCalled()
  })

  it('skips defaultHiddenKeys when empty array', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )
    expect(result.current.columnVisibility).toEqual({})
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })

  it('handles updater function for column order', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange((prev) => [...prev, 'new-col'])
    })

    expect(result.current.columnOrder).toEqual(['new-col'])
  })

  it('handles updater function for column visibility', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnVisibilityChange((prev) => ({
        ...prev,
        colX: false,
      }))
    })

    expect(result.current.columnVisibility).toEqual({ colX: false })
  })

  it('applies remote settings to local storage', async () => {
    getUserColumnSettingsMock.mockResolvedValue({
      pages: {
        'test-page': { orderedKeys: ['a'], hiddenKeys: ['b'] },
      },
    })

    renderHook(() => useColumnSettingsSupport('test-page', [], 10))

    await waitFor(() =>
      expect(setListColumnSettingsMock).toHaveBeenCalledWith(
        'test-page',
        { orderedKeys: ['a'], hiddenKeys: ['b'] },
        'user-1',
      ),
    )
  })

  it('skips applying remote settings when user already changed', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange(['user-col'])
    })

    expect(result.current.columnOrder).toEqual(['user-col'])
  })

  it('does not show duplicate sync warnings', async () => {
    saveUserColumnSettingsMock.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnOrderChange(['a'])
    })
    await waitFor(() => expect(messageWarningMock).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.handleColumnOrderChange(['b'])
    })
    await waitFor(() =>
      expect(saveUserColumnSettingsMock).toHaveBeenCalledTimes(2),
    )

    expect(messageWarningMock).toHaveBeenCalledTimes(1)
  })
})
