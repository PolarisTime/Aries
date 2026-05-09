import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

export function useDashboardServerTime(serverTime?: string | null) {
  const [animatedServerTime, setAnimatedServerTime] = useState('—')

  useEffect(() => {
    if (!serverTime) {
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
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [serverTime])

  return animatedServerTime
}
