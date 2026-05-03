const ROUTE_LOAD_RECOVERY_KEY = 'aries-route-load-recovery-attempted'

const RECOVERABLE_ROUTE_LOAD_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk .* failed/i,
  /chunkloaderror/i,
  /unable to preload css/i,
]

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return [error.name, error.message, error.stack].filter(Boolean).join('\n')
  }
  return String(error || '')
}

function getCurrentBrowserPath() {
  if (typeof window === 'undefined') {
    return '/'
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function isRecoverableRouteLoadError(error: unknown) {
  const errorText = getErrorText(error)
  return RECOVERABLE_ROUTE_LOAD_PATTERNS.some((pattern) => pattern.test(errorText))
}

export function clearRouteLoadRecoveryMarker() {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.sessionStorage.removeItem(ROUTE_LOAD_RECOVERY_KEY)
  } catch {
    // Ignore storage failures; route recovery is best-effort only.
  }
}

export function recoverRouteLoadError(targetPath?: string) {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    if (window.sessionStorage.getItem(ROUTE_LOAD_RECOVERY_KEY) === '1') {
      return false
    }
    window.sessionStorage.setItem(ROUTE_LOAD_RECOVERY_KEY, '1')
  } catch {
    // Continue without a marker if sessionStorage is unavailable.
  }

  window.location.assign(targetPath || getCurrentBrowserPath())
  return true
}
