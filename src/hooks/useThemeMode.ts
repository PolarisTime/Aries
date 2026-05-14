import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPersonalSettings,
  type ThemeMode,
  setPersonalSettings,
} from '@/utils/storage'

type ResolvedTheme = 'light' | 'dark'

const MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export function useThemeMode() {
  const initial = getPersonalSettings()?.themeMode ?? 'system'
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initial)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (themeMode === 'system' ? systemTheme : themeMode),
    [themeMode, systemTheme],
  )

  // Apply data-theme attribute whenever resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY)
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Sync from localStorage (when usePersonalSettings saves)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'aries-personal-settings') return
      const stored = getPersonalSettings()?.themeMode ?? 'system'
      setThemeModeState(stored)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    const current = getPersonalSettings() ?? {}
    setPersonalSettings({ ...current, themeMode: mode })
  }, [])

  return { themeMode, resolvedTheme, setThemeMode }
}
