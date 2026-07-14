import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useColumnSettingsSupport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
    authState = { user: { id: 'user-1', loginName: 'testuser' } }
    getListColumnSettingsMock.mockReturnValue(null)
    getUserColumnSettingsMock.mockResolvedValue({ pages: {} })
    saveUserColumnSettingsMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('resets remote settings with hidden keys when totalColumnCount is 0', async () => {
    getUserColumnSettingsMock.mockResolvedValue({
      pages: {
        'test-page': {
          orderedKeys: ['a'],
          hiddenKeys: ['hidden-col'],
        },
      },
    })

    renderHook(() => useColumnSettingsSupport('test-page', [], 0))

    await waitFor(() =>
      expect(setListColumnSettingsMock).toHaveBeenCalledWith(
        'test-page',
        { orderedKeys: [], hiddenKeys: [] },
        'user-1',
      ),
    )
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

  it('ignores remote settings when load resolves after unmount', async () => {
    const remoteLoad = createDeferred<{
      pages: Record<string, { orderedKeys: string[]; hiddenKeys: string[] }>
    }>()
    getUserColumnSettingsMock.mockReturnValue(remoteLoad.promise)

    const { unmount } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(getUserColumnSettingsMock).toHaveBeenCalled())
    unmount()

    await act(async () => {
      remoteLoad.resolve({
        pages: {
          'test-page': { orderedKeys: ['remote-col'], hiddenKeys: ['hidden'] },
        },
      })
      await remoteLoad.promise
    })

    expect(setListColumnSettingsMock).not.toHaveBeenCalled()
  })

  it('does not mark remote settings loaded when load rejects after unmount', async () => {
    const loadError = new Error('late failure')
    const remoteLoad = createDeferred<{
      pages: Record<string, { orderedKeys: string[]; hiddenKeys: string[] }>
    }>()
    getUserColumnSettingsMock.mockReturnValue(remoteLoad.promise)

    const { unmount } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(getUserColumnSettingsMock).toHaveBeenCalled())
    unmount()

    await act(async () => {
      remoteLoad.reject(loadError)
      await remoteLoad.promise.catch(() => undefined)
    })

    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Failed to load roaming column settings',
      loadError,
    )
  })

  it('handles empty remote response without local updates', async () => {
    getUserColumnSettingsMock.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(setListColumnSettingsMock).not.toHaveBeenCalled()
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

  it('persists only false visibility entries as hidden keys', async () => {
    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.handleColumnVisibilityChange({
        hiddenCol: false,
        visibleCol: true,
      })
    })

    await waitFor(() =>
      expect(setListColumnSettingsMock).toHaveBeenCalledWith(
        'test-page',
        { orderedKeys: [], hiddenKeys: ['hiddenCol'] },
        'user-1',
      ),
    )
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
    const remoteLoad = createDeferred<{
      pages: Record<string, { orderedKeys: string[]; hiddenKeys: string[] }>
    }>()
    getUserColumnSettingsMock.mockReturnValue(remoteLoad.promise)

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(getUserColumnSettingsMock).toHaveBeenCalled())

    act(() => {
      result.current.handleColumnOrderChange(['user-col'])
    })

    await act(async () => {
      remoteLoad.resolve({
        pages: {
          'test-page': {
            orderedKeys: ['remote-col'],
            hiddenKeys: ['remote-hidden'],
          },
        },
      })
      await remoteLoad.promise
    })

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.columnOrder).toEqual(['user-col'])
    expect(result.current.columnVisibility).toEqual({})
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

  it('retries network save failures before showing a warning', async () => {
    getUserColumnSettingsMock.mockResolvedValue({
      pages: {
        other: { orderedKeys: ['old'], hiddenKeys: ['legacy-hidden'] },
      },
    })
    saveUserColumnSettingsMock
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    vi.useFakeTimers()
    act(() => {
      result.current.handleColumnVisibilityChange({
        hiddenCol: false,
        visibleCol: true,
      })
    })

    expect(saveUserColumnSettingsMock).toHaveBeenCalledTimes(1)
    await flushMicrotasks()
    expect(vi.getTimerCount()).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(saveUserColumnSettingsMock).toHaveBeenCalledTimes(2)
    await flushMicrotasks()
    expect(vi.getTimerCount()).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(saveUserColumnSettingsMock).toHaveBeenCalledTimes(3)
    expect(saveUserColumnSettingsMock).toHaveBeenLastCalledWith({
      pages: {
        other: { orderedKeys: ['old'], hiddenKeys: ['legacy-hidden'] },
        'test-page': { orderedKeys: [], hiddenKeys: ['hiddenCol'] },
      },
    })
    expect(messageWarningMock).not.toHaveBeenCalled()
  })

  it('clears pending retry timers on unmount', async () => {
    saveUserColumnSettingsMock.mockRejectedValue(new TypeError('offline'))

    const { result, unmount } = renderHook(() =>
      useColumnSettingsSupport('test-page', [], 10),
    )

    await waitFor(() => expect(result.current.loaded).toBe(true))

    vi.useFakeTimers()
    act(() => {
      result.current.handleColumnOrderChange(['retry-col'])
    })

    expect(saveUserColumnSettingsMock).toHaveBeenCalledTimes(1)
    await flushMicrotasks()
    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
