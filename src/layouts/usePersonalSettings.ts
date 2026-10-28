import { useEffect, useState } from 'react'
import { contextMenuActionKeysByGroup } from '@/layouts/context-menu-actions'
import {
  type ContextMenuSettings,
  type PersonalSettings,
  type ThemeMode,
  useUiSettingsStore,
} from '@/stores/uiSettingsStore'

export type LayoutMode = NonNullable<PersonalSettings['layoutMode']>

interface UsePersonalSettingsOptions {
  defaultFontSize?: number
  defaultLayoutMode?: LayoutMode
  fontSizeCssVar?: string
}

export function getPersonalControlHeights(fontSize: number) {
  return {
    controlHeight: Math.max(28, fontSize + 18),
    controlHeightSM: Math.max(24, fontSize + 10),
    controlHeightLG: Math.max(40, fontSize + 26),
  }
}

/** 右键菜单偏好的"已生效"形态：只记被隐藏的动作 key，缺省空数组 = 全显示。 */
export interface AppliedContextMenuSettings {
  hiddenActionKeys: string[]
}

export const DEFAULT_CONTEXT_MENU_SETTINGS: AppliedContextMenuSettings = {
  hiddenActionKeys: [],
}

function normalizeContextMenu(
  settings: ContextMenuSettings | undefined,
): AppliedContextMenuSettings {
  return {
    hiddenActionKeys: [...(settings?.hiddenActionKeys ?? [])],
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
    contextMenu: normalizeContextMenu(settings?.contextMenu),
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
  const defaultFontSize = options.defaultFontSize ?? 14
  const defaultLayoutMode = options.defaultLayoutMode ?? 'top'
  const fontSizeCssVar = options.fontSizeCssVar ?? '--app-font-size'
  const storedSettings = useUiSettingsStore((state) => state.settings)
  const persistSettings = useUiSettingsStore((state) => state.setSettings)
  const initialSettings = normalizePersonalSettings(
    storedSettings,
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
  const [contextMenu, setContextMenu] = useState<AppliedContextMenuSettings>(
    initialSettings.contextMenu,
  )
  const [appliedContextMenu, setAppliedContextMenu] =
    useState<AppliedContextMenuSettings>(initialSettings.contextMenu)

  /** 单项开关：把 key 加入/移出隐藏集合。 */
  const toggleContextMenuAction = (actionKey: string, visible: boolean) => {
    setContextMenu((previous) => {
      const hidden = new Set(previous.hiddenActionKeys)
      if (visible) {
        hidden.delete(actionKey)
      } else {
        hidden.add(actionKey)
      }
      return { hiddenActionKeys: [...hidden] }
    })
  }

  /** 整组开关（设置页每组的「全选」）：一次性加入/移出该组全部 key。 */
  const setContextMenuGroupVisible = (
    group: 'row' | 'bulk',
    visible: boolean,
  ) => {
    setContextMenu((previous) => {
      const hidden = new Set(previous.hiddenActionKeys)
      for (const key of contextMenuActionKeysByGroup(group)) {
        if (visible) {
          hidden.delete(key)
        } else {
          hidden.add(key)
        }
      }
      return { hiddenActionKeys: [...hidden] }
    })
  }

  const applySettings = (settings: PersonalSettings | null | undefined) => {
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
    setContextMenu(normalized.contextMenu)
    setAppliedContextMenu(normalized.contextMenu)
  }

  const load = () => {
    applySettings(useUiSettingsStore.getState().settings)
  }

  useEffect(() => {
    applyPersonalFontSize(appliedFontSize, fontSizeCssVar)
  }, [appliedFontSize, fontSizeCssVar])

  const open = () => {
    setVisible(true)
  }

  const close = () => {
    setFontSize(appliedFontSize)
    setLayoutMode(appliedLayoutMode)
    setThemeMode(appliedThemeMode)
    setContextMenu(appliedContextMenu)
    setVisible(false)
  }

  const reset = () => {
    setFontSize(defaultFontSize)
    setLayoutMode(defaultLayoutMode)
    setThemeMode('system')
    setContextMenu(DEFAULT_CONTEXT_MENU_SETTINGS)
  }

  const save = () => {
    setAppliedFontSize(fontSize)
    setAppliedLayoutMode(layoutMode)
    setAppliedThemeMode(themeMode)
    setAppliedContextMenu(contextMenu)
    persistSettings({
      fontSize,
      layoutMode,
      themeMode,
      contextMenu,
    })
    window.dispatchEvent(new CustomEvent('personal-settings-changed'))
    setVisible(false)
  }

  return {
    visible,
    fontSize,
    appliedFontSize,
    setFontSize,
    layoutMode,
    appliedLayoutMode,
    setLayoutMode,
    themeMode,
    appliedThemeMode,
    setThemeMode,
    contextMenu,
    appliedContextMenu,
    toggleContextMenuAction,
    setContextMenuGroupVisible,
    open,
    close,
    reset,
    save,
    load,
  }
}
