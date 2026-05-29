import { useEffect, useRef, useState } from 'react'
import { fetchBackendHealth } from '@/api/auth'

const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_MAX_RETRIES = 5
const HEALTH_CHECK_MAX_BACKOFF_MS = 30_000
const INITIAL_BOOT_DELAY_MS = 1200

export function useBackendStatus(token: string): { backendOnline: boolean } {
  const [backendOnline, setBackendOnline] = useState(false)
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthRetriesRef = useRef(0)

  const checkBackendHealth = async (): Promise<void> => {
    try {
      const body = await fetchBackendHealth()
      setBackendOnline(body.status === 'UP')
      healthRetriesRef.current = 0
    } catch {
      setBackendOnline(false)
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
      setBackendOnline(false)
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
