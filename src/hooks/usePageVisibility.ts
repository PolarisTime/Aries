import { useEffect, useState } from 'react'

function getPageVisibleState() {
  if (typeof document === 'undefined') {
    return true
  }
  return document.visibilityState !== 'hidden'
}

export function usePageVisibility() {
  const [isPageVisible, setIsPageVisible] = useState(getPageVisibleState)

  useEffect(() => {
    const syncVisibility = () => {
      setIsPageVisible(getPageVisibleState())
    }

    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    window.addEventListener('focus', syncVisibility)
    window.addEventListener('blur', syncVisibility)

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
      window.removeEventListener('focus', syncVisibility)
      window.removeEventListener('blur', syncVisibility)
    }
  }, [])

  return isPageVisible
}
