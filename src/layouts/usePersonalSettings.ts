import { useCallback, useEffect, useState } from 'react'
import {
  getPersonalSettings,
  setPersonalSettings,
  type PersonalSettings,
} from '@/utils/storage'

export type LayoutMode = NonNullable<PersonalSettings['layoutMode']>

interface UsePersonalSettingsOptions {
  defaultFontSize?: number
  defaultLayoutMode?: LayoutMode
  fontSizeCssVar?: string
}

function applyPersonalFontSize(fontSize: number, cssVarName: string) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.style.setProperty(cssVarName, `${fontSize}px`)
}

export function usePersonalSettings(options: UsePersonalSettingsOptions = {}) {
  const defaultFontSize = options.defaultFontSize ?? 12
  const defaultLayoutMode = options.defaultLayoutMode ?? 'top'
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const [visible, setVisible] = useState(false)
  const [fontSize, setFontSize] = useState(defaultFontSize)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(defaultLayoutMode)

  const applySettings = useCallback((settings: PersonalSettings | null | undefined) => {
    const nextFontSize = settings?.fontSize || defaultFontSize
    const nextLayoutMode =
      settings?.layoutMode === 'top' || settings?.layoutMode === 'sider'
        ? settings.layoutMode
        : defaultLayoutMode
    setFontSize(nextFontSize)
    setLayoutMode(nextLayoutMode)
    applyPersonalFontSize(nextFontSize, fontSizeCssVar)
  }, [defaultFontSize, defaultLayoutMode, fontSizeCssVar])

  const load = useCallback(() => {
    applySettings(getPersonalSettings())
  }, [applySettings])

  useEffect(() => {
    load()
  }, [load])

  const open = useCallback(() => {
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    setVisible(false)
  }, [])

  const reset = useCallback(() => {
    setFontSize(defaultFontSize)
    setLayoutMode(defaultLayoutMode)
  }, [defaultFontSize, defaultLayoutMode])

  const save = useCallback(() => {
    applyPersonalFontSize(fontSize, fontSizeCssVar)
    setPersonalSettings({ fontSize, layoutMode })
    setVisible(false)
  }, [fontSize, fontSizeCssVar, layoutMode])

  return {
    visible,
    fontSize,
    setFontSize,
    layoutMode,
    setLayoutMode,
    open,
    close,
    reset,
    save,
    load,
  }
}
