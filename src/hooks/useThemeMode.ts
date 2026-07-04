import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { type ThemeMode, useUiSettingsStore } from '@/stores/uiSettingsStore'

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
  const themeMode = useUiSettingsStore(
    (state) => state.settings?.themeMode ?? 'system',
  )
  const persistThemeMode = useUiSettingsStore((state) => state.setThemeMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  const resolvedTheme: ResolvedTheme =
    themeMode === 'system' ? systemTheme : themeMode

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
      if (e.key !== STORAGE_KEYS.personalSettings) return
      void useUiSettingsStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    persistThemeMode(mode)
  }

  return { themeMode, resolvedTheme, setThemeMode }
}
