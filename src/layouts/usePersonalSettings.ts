import { useCallback, useEffect, useState } from 'react'
import {
  getPersonalSettings,
  setPersonalSettings,
  type PersonalSettings,
} from '@/utils/storage'

interface UsePersonalSettingsOptions {
  defaultFontSize?: number
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
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const [visible, setVisible] = useState(false)
  const [fontSize, setFontSize] = useState(defaultFontSize)

  const applySettings = useCallback((settings: PersonalSettings | null | undefined) => {
    const nextFontSize = settings?.fontSize || defaultFontSize
    setFontSize(nextFontSize)
    applyPersonalFontSize(nextFontSize, fontSizeCssVar)
  }, [defaultFontSize, fontSizeCssVar])

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
    const settings = getPersonalSettings()
    setFontSize(settings?.fontSize || defaultFontSize)
  }, [defaultFontSize])

  const save = useCallback(() => {
    applyPersonalFontSize(fontSize, fontSizeCssVar)
    setPersonalSettings({ fontSize })
    setVisible(false)
  }, [fontSize, fontSizeCssVar])

  return {
    visible,
    fontSize,
    setFontSize,
    open,
    close,
    reset,
    save,
    load,
  }
}
