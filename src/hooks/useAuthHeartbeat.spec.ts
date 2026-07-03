import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pingAuthMock, loggerWarnMock } = vi.hoisted(() => ({
  pingAuthMock: vi.fn().mockResolvedValue(undefined),
  loggerWarnMock: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  pingAuth: pingAuthMock,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: any) => any) =>
    selector({
      token: 'test-token',
    }),
  ),
}))

vi.mock('@/utils/logger', () => ({
  logger: { warn: loggerWarnMock },
}))

import { useAuthStore } from '@/stores/authStore'
import { useAuthHeartbeat } from './useAuthHeartbeat'

describe('useAuthHeartbeat', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()

    vi.mocked(useAuthStore).mockImplementation(
      (selector: (state: any) => any) =>
        selector({
          token: 'test-token',
        }),
    )
    pingAuthMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts heartbeat interval when token exists', () => {
    renderHook(() => useAuthHeartbeat())
    expect(pingAuthMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(1)
  })

  it('does not start heartbeat when token is null', () => {
    vi.mocked(useAuthStore).mockImplementation(
      (selector: (state: any) => any) =>
        selector({
          token: null,
        }),
    )
    renderHook(() => useAuthHeartbeat())

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(pingAuthMock).not.toHaveBeenCalled()
  })

  it('calls pingAuth repeatedly at interval', () => {
    renderHook(() => useAuthHeartbeat())

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(3)
  })

  it('logs warning when pingAuth fails', async () => {
    const error = new Error('Network error')
    pingAuthMock.mockRejectedValueOnce(error)

    renderHook(() => useAuthHeartbeat())
    vi.advanceTimersByTime(5 * 60 * 1000)

    await vi.waitFor(() => {
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Auth heartbeat failed',
        error,
      )
    })
  })

  it('cleans up interval on unmount', () => {
    const { unmount } = renderHook(() => useAuthHeartbeat())
    unmount()

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(pingAuthMock).not.toHaveBeenCalled()
  })

  it('skips clearing when interval id is falsy', () => {
    const setIntervalSpy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as never)
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = renderHook(() => useAuthHeartbeat())
    unmount()

    expect(clearIntervalSpy).not.toHaveBeenCalled()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('restarts heartbeat when token changes', () => {
    const { rerender } = renderHook(() => useAuthHeartbeat())

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(1)

    vi.mocked(useAuthStore).mockImplementation(
      (selector: (state: any) => any) =>
        selector({
          token: 'new-token',
        }),
    )
    rerender()

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(pingAuthMock).toHaveBeenCalledTimes(2)
  })
})
