import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { parseDateTimeValue } from '@/utils/formatters'

function formatServerTime(serverTime?: string | number | null) {
  if (serverTime == null || serverTime === '') {
    return '—'
  }
  const parsed = parseDateTimeValue(serverTime)
  if (!parsed) {
    return String(serverTime)
  }
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

export function useDashboardServerTime(serverTime?: string | number | null) {
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
    const parsed = parseDateTimeValue(serverTime)
    if (!parsed) {
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
