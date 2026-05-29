import { useEffect, useRef, useState } from 'react'
import { fetchBackendHealth } from '@/api/auth'

const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_MAX_RETRIES = 5
const HEALTH_CHECK_MAX_BACKOFF_MS = 30_000
const INITIAL_BOOT_DELAY_MS = 1200

export function useBackendStatus(token: string): { backendOnline: boolean } {
  const [healthState, setHealthState] = useState<{
    backendOnline: boolean
    token: string
  }>({ backendOnline: false, token })
  const backendOnline = token ? healthState.backendOnline : false
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthRetriesRef = useRef(0)

  const checkBackendHealth = async (): Promise<void> => {
    try {
      const body = await fetchBackendHealth()
      setHealthState({ backendOnline: body.status === 'UP', token })
      healthRetriesRef.current = 0
    } catch {
      setHealthState({ backendOnline: false, token })
      healthRetriesRef.current += 1
      if (healthRetriesRef.current <= HEALTH_CHECK_MAX_RETRIES) {
        const delay = Math.min(
          1000 * 2 ** healthRetriesRef.current,
          HEALTH_CHECK_MAX_BACKOFF_MS,
        )
        window.setTimeout(checkBackendHealth, delay)
      }
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }

    const timer = window.setTimeout(() => {
      void checkBackendHealth()
      healthTimerRef.current = setInterval(() => {
        if (healthRetriesRef.current === 0) {
          void checkBackendHealth()
        }
      }, HEALTH_CHECK_INTERVAL_MS)
    }, INITIAL_BOOT_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
      }
    }
  }, [checkBackendHealth, token])

  return {
    backendOnline,
  }
}
