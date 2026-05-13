import { useEffect, useRef } from 'react'
import { getTokenExpiresAt } from '@/utils/storage'

const PRE_REFRESH_ADVANCE_MS = 5 * 60 * 1000

export function useAuthRefreshTimer(onRefresh: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const schedule = () => {
      const expiresAt = getTokenExpiresAt()
      if (!expiresAt) return

      const delay = expiresAt - Date.now() - PRE_REFRESH_ADVANCE_MS
      if (delay <= 0) return

      timerRef.current = setTimeout(() => {
        onRefresh()
      }, delay)
    }

    schedule()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [onRefresh])
}
