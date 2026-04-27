import { onBeforeUnmount, onMounted } from 'vue'

interface UseAuthHeartbeatOptions {
  ping: () => Promise<unknown> | unknown
  intervalMs?: number
  autoStart?: boolean
  onError?: (error: unknown) => void
}

export function useAuthHeartbeat(options: UseAuthHeartbeatOptions) {
  const intervalMs = options.intervalMs ?? 60_000
  let heartbeatTimer: ReturnType<typeof window.setInterval> | null = null

  function stop() {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  async function runPing() {
    try {
      await options.ping()
    } catch (error) {
      if (options.onError) {
        options.onError(error)
        return
      }
      console.warn('Auth heartbeat failed', error)
    }
  }

  function start() {
    stop()
    void runPing()
    heartbeatTimer = window.setInterval(() => {
      void runPing()
    }, intervalMs)
  }

  if (options.autoStart !== false) {
    onMounted(() => {
      start()
    })

    onBeforeUnmount(() => {
      stop()
    })
  }

  return {
    start,
    stop,
  }
}
