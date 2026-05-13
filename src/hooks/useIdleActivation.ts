import { useEffect, useState } from 'react'

type IdleCallbackHandle = number
type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

export function useIdleActivation(enabled = true, timeout = 1200) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
      setActive(false)
      return
    }

    if (typeof window === 'undefined') {
      setActive(true)
      return
    }

    type _IdleWindow = Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: (deadline: IdleDeadlineLike) => void,
          options?: { timeout?: number },
        ) => IdleCallbackHandle
        cancelIdleCallback?: (handle: IdleCallbackHandle) => void
      }

    const idleWindow = window
    setActive(false)

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(() => setActive(true), {
        timeout,
      })
      return () => idleWindow.cancelIdleCallback?.(handle)
    }

    const handle = window.setTimeout(() => setActive(true), 180)
    return () => window.clearTimeout(handle)
  }, [enabled, timeout])

  return active
}
