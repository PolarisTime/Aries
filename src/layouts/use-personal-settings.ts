import { ref } from 'vue'
import {
  getPersonalSettings,
  setPersonalSettings,
  type PersonalSettings,
} from '@/utils/storage'

interface UsePersonalSettingsOptions {
  defaultFontSize?: number
  fontSizeCssVar?: string
}

export function applyPersonalFontSize(
  fontSize: number,
  cssVarName = '--app-font-size',
) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.style.setProperty(cssVarName, `${fontSize}px`)
}

export function usePersonalSettings(options: UsePersonalSettingsOptions = {}) {
  const defaultFontSize = options.defaultFontSize ?? 12
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const visible = ref(false)
  const fontSize = ref(defaultFontSize)

  function applySettings(settings: PersonalSettings | null | undefined) {
    fontSize.value = settings?.fontSize || defaultFontSize
    applyPersonalFontSize(fontSize.value, fontSizeCssVar)
  }

  function load() {
    applySettings(getPersonalSettings())
  }

  function open() {
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  function reset() {
    fontSize.value = defaultFontSize
  }

  function save() {
    applyPersonalFontSize(fontSize.value, fontSizeCssVar)
    setPersonalSettings({
      fontSize: fontSize.value,
    })
    close()
  }

  if (typeof window !== 'undefined') {
    load()
  }

  return {
    close,
    fontSize,
    load,
    open,
    reset,
    save,
    visible,
  }
}
