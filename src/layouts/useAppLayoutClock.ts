import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

export function useAppLayoutClock() {
  const [clock, setClock] = useState(() => dayjs())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(dayjs()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return clock
}
