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
      if (delay <= 0) {
        // 令牌已过期或即将过期，立即刷新
        onRefresh()
        return
      }

      timerRef.current = setTimeout(
        () => {
          onRefresh()
        },
        Math.min(delay, 2_147_483_647),
      )
    }

    schedule()

    return () => {
      const timer = timerRef.current
      if (timer) clearTimeout(timer)
    }
  }, [onRefresh])
}
