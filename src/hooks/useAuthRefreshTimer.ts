import { useEffect } from 'react'
import { getTokenExpiresAt } from '@/utils/storage'

const PRE_REFRESH_ADVANCE_MS = 5 * 60 * 1000

export function useAuthRefreshTimer(onRefresh: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      const expiresAt = getTokenExpiresAt()
      if (!expiresAt) return

      const delay = expiresAt - Date.now() - PRE_REFRESH_ADVANCE_MS
      if (delay <= 0) {
        // 令牌已过期或即将过期，立即刷新
        onRefresh()
        return
      }

      timer = setTimeout(
        () => {
          onRefresh()
        },
        Math.min(delay, 2_147_483_647),
      )
    }

    schedule()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [onRefresh])
}
