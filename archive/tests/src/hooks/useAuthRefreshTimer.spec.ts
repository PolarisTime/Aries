import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTokenExpiresAtMock } = vi.hoisted(() => ({
  getTokenExpiresAtMock: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({
  getTokenExpiresAt: getTokenExpiresAtMock,
}))

import { useAuthRefreshTimer } from './useAuthRefreshTimer'

describe('useAuthRefreshTimer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules refresh 5 minutes before token expires', () => {
    const onRefresh = vi.fn()
    const now = Date.now()
    const expiresAt = now + 10 * 60 * 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    renderHook(() => useAuthRefreshTimer(onRefresh))

    expect(onRefresh).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls onRefresh immediately when token is already expired', () => {
    const onRefresh = vi.fn()
    const now = Date.now()
    const expiresAt = now - 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    renderHook(() => useAuthRefreshTimer(onRefresh))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls onRefresh immediately when token expires within 5 minutes', () => {
    const onRefresh = vi.fn()
    const now = Date.now()
    const expiresAt = now + 2 * 60 * 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    renderHook(() => useAuthRefreshTimer(onRefresh))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not schedule refresh when no expiry time', () => {
    const onRefresh = vi.fn()
    getTokenExpiresAtMock.mockReturnValue(null)

    renderHook(() => useAuthRefreshTimer(onRefresh))

    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('cleans up timer on unmount', () => {
    const onRefresh = vi.fn()
    const now = Date.now()
    const expiresAt = now + 10 * 60 * 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    const { unmount } = renderHook(() => useAuthRefreshTimer(onRefresh))
    unmount()

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('reschedules when onRefresh callback changes', () => {
    const onRefresh1 = vi.fn()
    const onRefresh2 = vi.fn()
    const now = Date.now()
    const expiresAt = now + 10 * 60 * 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    const { rerender } = renderHook(({ cb }) => useAuthRefreshTimer(cb), {
      initialProps: { cb: onRefresh1 },
    })

    rerender({ cb: onRefresh2 })

    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(onRefresh1).not.toHaveBeenCalled()
    expect(onRefresh2).toHaveBeenCalledTimes(1)
  })

  it('clamps delay to max 32-bit integer', () => {
    const onRefresh = vi.fn()
    const now = Date.now()
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000
    getTokenExpiresAtMock.mockReturnValue(expiresAt)

    renderHook(() => useAuthRefreshTimer(onRefresh))

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
