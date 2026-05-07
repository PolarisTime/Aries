import { ref } from 'vue'
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
  const defaultLayoutMode = options.defaultLayoutMode ?? 'top'
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const visible = ref(false)
  const fontSize = ref(defaultFontSize)
  const layoutMode = ref<LayoutMode>(defaultLayoutMode)

  function applySettings(settings: PersonalSettings | null | undefined) {
    fontSize.value = settings?.fontSize || defaultFontSize
    layoutMode.value =
      settings?.layoutMode === 'top' || settings?.layoutMode === 'sider'
        ? settings.layoutMode
        : defaultLayoutMode
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
    layoutMode.value = defaultLayoutMode
  }

  function save() {
    applyPersonalFontSize(fontSize.value, fontSizeCssVar)
    setPersonalSettings({
      fontSize: fontSize.value,
      layoutMode: layoutMode.value,
    })
    close()
  }

  if (typeof window !== 'undefined') {
    load()
  }

  return {
    close,
    fontSize,
    layoutMode,
    load,
    open,
    reset,
    save,
    visible,
  }
}
