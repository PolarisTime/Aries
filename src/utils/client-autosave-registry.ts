export type ClientAutosaveReason =
  | 'editor-change'
  | 'error-boundary'
  | 'items-change'
  | 'pagehide'
  | 'parent-import'
  | 'unhandled-rejection'
  | 'visibility-hidden'
  | 'window-error'

type ClientAutosaveHandler = (reason: ClientAutosaveReason) => void

const handlers = new Set<ClientAutosaveHandler>()

export function registerClientAutosaveHandler(handler: ClientAutosaveHandler) {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function flushClientAutosaveHandlers(reason: ClientAutosaveReason) {
  for (const handler of handlers) {
    handler(reason)
  }
}

export function installClientAutosaveFlushListeners() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const handleWindowError = () => flushClientAutosaveHandlers('window-error')
  const handleUnhandledRejection = () =>
    flushClientAutosaveHandlers('unhandled-rejection')
  const handlePageHide = () => flushClientAutosaveHandlers('pagehide')
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushClientAutosaveHandlers('visibility-hidden')
    }
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    window.removeEventListener('pagehide', handlePageHide)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
