import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBackendHealth } from '@/api/auth'
import { useBackendStatus } from '@/layouts/useBackendStatus'

vi.mock('@/api/auth', () => ({
  fetchBackendHealth: vi.fn(),
}))

describe('useBackendStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fetchBackendHealth).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when no token is provided', () => {
    const { result } = renderHook(() => useBackendStatus(''))
    expect(result.current.backendOnline).toBe(false)
  })

  it('checks backend health after initial delay', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({
      status: 'UP',
      timestamp: '2026-07-05T03:30:00Z',
    })

    const { result } = renderHook(() => useBackendStatus('token'))

    expect(result.current.backendOnline).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)
    expect('backendVersion' in result.current).toBe(false)
  })

  it('sets backendOnline to false when health check fails', async () => {
    vi.mocked(fetchBackendHealth).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(false)
  })

  it('sets backendOnline to false when status is not UP', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({ status: 'DOWN' })

    const { result } = renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(false)
  })

  it('retries health check on failure', async () => {
    vi.mocked(fetchBackendHealth)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        status: 'UP',
        timestamp: '2026-07-05T03:30:00Z',
      })

    const { result } = renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)
  })

  it('stops retrying after max retries', async () => {
    vi.mocked(fetchBackendHealth).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBackendStatus('token'))

    for (let i = 0; i <= 6; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(i === 0 ? 1200 : 2000 * 2 ** i)
        await vi.advanceTimersByTimeAsync(0)
      })
    }

    expect(result.current.backendOnline).toBe(false)
  })

  it('checks health periodically after initial check', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({ status: 'UP' })

    const { result } = renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)
    expect(fetchBackendHealth).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).toHaveBeenCalledTimes(2)
  })

  it('cleans up timers on unmount', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({ status: 'UP' })

    const { unmount } = renderHook(() => useBackendStatus('token'))

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).not.toHaveBeenCalled()
  })

  it('handles token change', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({ status: 'UP' })

    const { result, rerender } = renderHook(
      ({ token }) => useBackendStatus(token),
      { initialProps: { token: 'token1' } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)

    rerender({ token: 'token2' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)
  })

  it('hides stale health state while token changes', async () => {
    vi.mocked(fetchBackendHealth).mockResolvedValue({
      status: 'UP',
      timestamp: '2026-07-05T03:30:00Z',
    })

    const { result, rerender } = renderHook(
      ({ token }) => useBackendStatus(token),
      { initialProps: { token: 'token1' } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)

    rerender({ token: 'token2' })

    expect(result.current.backendOnline).toBe(false)
  })

  it('keeps backend status offline when new token health check fails', async () => {
    vi.mocked(fetchBackendHealth)
      .mockResolvedValueOnce({
        status: 'UP',
        timestamp: '2026-07-05T03:30:00Z',
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const { result, rerender } = renderHook(
      ({ token }) => useBackendStatus(token),
      { initialProps: { token: 'token1' } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(true)

    rerender({ token: 'token2' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.backendOnline).toBe(false)
  })

  it('uses exponential backoff for retries', async () => {
    vi.mocked(fetchBackendHealth).mockRejectedValue(new Error('Network error'))

    renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).toHaveBeenCalledTimes(3)
  })

  it('cleans up retry timers on unmount', async () => {
    vi.mocked(fetchBackendHealth).mockRejectedValue(new Error('Network error'))

    const { unmount } = renderHook(() => useBackendStatus('token'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
      await vi.advanceTimersByTimeAsync(0)
    })

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchBackendHealth).toHaveBeenCalledTimes(1)
  })
})
