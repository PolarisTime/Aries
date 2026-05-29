import { useSyncExternalStore } from 'react'

function getPageVisibleState() {
  if (typeof document === 'undefined') {
    return true
  }
  return document.visibilityState !== 'hidden'
}

function subscribePageVisibility(syncVisibility: () => void) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => undefined
  }
  document.addEventListener('visibilitychange', syncVisibility)
  window.addEventListener('focus', syncVisibility)
  window.addEventListener('blur', syncVisibility)
  return () => {
    document.removeEventListener('visibilitychange', syncVisibility)
    window.removeEventListener('focus', syncVisibility)
    window.removeEventListener('blur', syncVisibility)
  }
}

export function usePageVisibility() {
  return useSyncExternalStore(
    subscribePageVisibility,
    getPageVisibleState,
    () => true,
  )
}
