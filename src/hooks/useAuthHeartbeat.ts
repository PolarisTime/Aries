import { useEffect, useRef } from 'react'
import { pingAuth } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

const HEARTBEAT_INTERVAL = 5 * 60 * 1000

export function useAuthHeartbeat() {
  const token = useAuthStore((s) => s.token)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!token) return

    timerRef.current = setInterval(() => {
      pingAuth().catch(() => {
        // silent fail
      })
    }, HEARTBEAT_INTERVAL)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [token])
}
