import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { usePageVisibility } from '@/hooks/usePageVisibility'

function formatServerTime(serverTime?: string | null) {
  if (!serverTime) {
    return '—'
  }
  const parsed = dayjs(serverTime)
  if (!parsed.isValid()) {
    return serverTime
  }
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

export function useDashboardServerTime(serverTime?: string | null) {
  const [tickingServerTime, setTickingServerTime] = useState({
    source: '',
    value: '',
  })
  const isPageVisible = usePageVisibility()
  const displayServerTime =
    tickingServerTime.source === String(serverTime || '')
      ? tickingServerTime.value
      : formatServerTime(serverTime)

  useEffect(() => {
    const parsed = dayjs(serverTime)
    if (!parsed.isValid()) {
      return
    }

    const base = parsed.valueOf()
    const syncedAt = Date.now()
    const update = () => {
      setTickingServerTime({
        source: String(serverTime || ''),
        value: dayjs(base + (Date.now() - syncedAt)).format(
          'YYYY-MM-DD HH:mm:ss',
        ),
      })
    }

    if (!isPageVisible) {
      return
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [isPageVisible, serverTime])

  return displayServerTime
}
