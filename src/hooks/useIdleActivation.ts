import { useEffect, useState } from 'react'

type IdleCallbackHandle = number
type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: (deadline: IdleDeadlineLike) => void,
      options?: { timeout?: number },
    ) => IdleCallbackHandle
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void
  }

export function useIdleActivation(enabled = true, timeout = 1200) {
  const [idleState, setIdleState] = useState({ enabled, ready: false })
  const active =
    enabled &&
    (typeof window === 'undefined' || idleState.ready) &&
    idleState.enabled === enabled

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const idleWindow: IdleWindow = window

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(
        () => setIdleState({ enabled, ready: true }),
        {
          timeout,
        },
      )
      return () => idleWindow.cancelIdleCallback?.(handle)
    }

    const handle = window.setTimeout(
      () => setIdleState({ enabled, ready: true }),
      180,
    )
    return () => window.clearTimeout(handle)
  }, [enabled, timeout])

  return active
}
