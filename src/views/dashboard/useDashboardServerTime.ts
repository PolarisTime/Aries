import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { usePageVisibility } from '@/hooks/usePageVisibility'

export function useDashboardServerTime(serverTime?: string | null) {
  const [animatedServerTime, setAnimatedServerTime] = useState('—')
  const isPageVisible = usePageVisibility()

  useEffect(() => {
    if (!serverTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
      setAnimatedServerTime('—')
      return
    }

    const parsed = dayjs(serverTime)
    if (!parsed.isValid()) {
      setAnimatedServerTime(serverTime)
      return
    }

    const base = parsed.valueOf()
    const syncedAt = Date.now()
    const update = () => {
      setAnimatedServerTime(
        dayjs(base + (Date.now() - syncedAt)).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    update()
    if (!isPageVisible) {
      return
    }
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [isPageVisible, serverTime])

  return animatedServerTime
}
