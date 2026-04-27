import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthHeartbeat } from '@/layouts/use-auth-heartbeat'

describe('useAuthHeartbeat', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pings immediately and keeps pinging until stopped', () => {
    vi.useFakeTimers()
    const ping = vi.fn()

    const heartbeat = useAuthHeartbeat({
      ping,
      intervalMs: 1_000,
      autoStart: false,
    })

    heartbeat.start()
    expect(ping).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2_500)
    expect(ping).toHaveBeenCalledTimes(3)

    heartbeat.stop()
    vi.advanceTimersByTime(2_000)
    expect(ping).toHaveBeenCalledTimes(3)
  })

  it('reports ping errors through onError', async () => {
    const pingError = new Error('ping failed')
    const ping = vi.fn().mockRejectedValue(pingError)
    const onError = vi.fn()

    const heartbeat = useAuthHeartbeat({
      ping,
      onError,
      autoStart: false,
    })

    heartbeat.start()
    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith(pingError)
  })
})
