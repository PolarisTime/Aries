import { useCallback, useEffect, useState } from 'react'
import {
  getPersonalSettings,
  type PersonalSettings,
  setPersonalSettings,
  type ThemeMode,
} from '@/utils/storage'

export type LayoutMode = NonNullable<PersonalSettings['layoutMode']>

interface UsePersonalSettingsOptions {
  defaultFontSize?: number
  defaultLayoutMode?: LayoutMode
  fontSizeCssVar?: string
}

export function getPersonalControlHeights(fontSize: number) {
  return {
    controlHeight: Math.max(32, fontSize + 20),
    controlHeightSM: Math.max(24, fontSize + 12),
    controlHeightLG: Math.max(40, fontSize + 28),
  }
}

function normalizePersonalSettings(
  settings: PersonalSettings | null | undefined,
  defaultFontSize: number,
  defaultLayoutMode: LayoutMode,
) {
  return {
    fontSize: settings?.fontSize || defaultFontSize,
    layoutMode:
      settings?.layoutMode === 'top' || settings?.layoutMode === 'sider'
        ? settings.layoutMode
        : defaultLayoutMode,
    themeMode:
      settings?.themeMode === 'light' ||
      settings?.themeMode === 'dark' ||
      settings?.themeMode === 'system'
        ? settings.themeMode
        : ('system' as ThemeMode),
  }
}

function applyPersonalFontSize(fontSize: number, cssVarName: string) {
  if (typeof document === 'undefined') {
    return
  }
  const { controlHeight, controlHeightSM, controlHeightLG } =
    getPersonalControlHeights(fontSize)
  document.documentElement.style.setProperty(cssVarName, `${fontSize}px`)
  document.documentElement.style.setProperty(
    '--app-control-height',
    `${controlHeight}px`,
  )
  document.documentElement.style.setProperty(
    '--app-control-height-sm',
    `${controlHeightSM}px`,
  )
  document.documentElement.style.setProperty(
    '--app-control-height-lg',
    `${controlHeightLG}px`,
  )
}

export function usePersonalSettings(options: UsePersonalSettingsOptions = {}) {
  const defaultFontSize = options.defaultFontSize ?? 12
  const defaultLayoutMode = options.defaultLayoutMode ?? 'top'
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const initialSettings = normalizePersonalSettings(
    getPersonalSettings(),
    defaultFontSize,
    defaultLayoutMode,
  )
  const [visible, setVisible] = useState(false)
  const [fontSize, setFontSize] = useState(initialSettings.fontSize)
  const [appliedFontSize, setAppliedFontSize] = useState(
    initialSettings.fontSize,
  )
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    initialSettings.layoutMode,
  )
  const [appliedLayoutMode, setAppliedLayoutMode] = useState<LayoutMode>(
    initialSettings.layoutMode,
  )
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    initialSettings.themeMode,
  )
  const [appliedThemeMode, setAppliedThemeMode] = useState<ThemeMode>(
    initialSettings.themeMode,
  )

  const applySettings = useCallback(
    (settings: PersonalSettings | null | undefined) => {
      const normalized = normalizePersonalSettings(
        settings,
        defaultFontSize,
        defaultLayoutMode,
      )
      setFontSize(normalized.fontSize)
      setAppliedFontSize(normalized.fontSize)
      setLayoutMode(normalized.layoutMode)
      setAppliedLayoutMode(normalized.layoutMode)
      setThemeMode(normalized.themeMode)
      setAppliedThemeMode(normalized.themeMode)
    },
    [defaultFontSize, defaultLayoutMode],
  )

  const load = useCallback(() => {
    applySettings(getPersonalSettings())
  }, [applySettings])

  useEffect(() => {
    applyPersonalFontSize(appliedFontSize, fontSizeCssVar)
  }, [appliedFontSize, fontSizeCssVar])

  const open = useCallback(() => {
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setFontSize(appliedFontSize)
    setLayoutMode(appliedLayoutMode)
    setThemeMode(appliedThemeMode)
    setVisible(false)
  }, [appliedFontSize, appliedLayoutMode, appliedThemeMode])

  const reset = useCallback(() => {
    setFontSize(defaultFontSize)
    setLayoutMode(defaultLayoutMode)
    setThemeMode('system')
  }, [defaultFontSize, defaultLayoutMode])

  const save = useCallback(() => {
    setAppliedFontSize(fontSize)
    setAppliedLayoutMode(layoutMode)
    setAppliedThemeMode(themeMode)
    setPersonalSettings({ fontSize, layoutMode, themeMode })
    window.dispatchEvent(new CustomEvent('personal-settings-changed'))
    setVisible(false)
  }, [fontSize, layoutMode, themeMode])

  return {
    visible,
    fontSize,
    appliedFontSize,
    setFontSize,
    layoutMode,
    appliedLayoutMode,
    setLayoutMode,
    themeMode,
    setThemeMode,
    open,
    close,
    reset,
    save,
    load,
  }
}
