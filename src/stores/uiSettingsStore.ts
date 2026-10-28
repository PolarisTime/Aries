import { create } from 'zustand'
import { type PersistStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/constants/storage'
import {
  CONTEXT_MENU_ACTIONS,
  contextMenuActionKeysByGroup,
} from '@/layouts/context-menu-actions'

export type ThemeMode = 'light' | 'dark' | 'system'
export type LayoutMode = 'sider' | 'top'

/**
 * 列表页行右键菜单的显示偏好。
 *
 * <p>菜单项来自固定词表（行级动作 + 批量动作，见 `layouts/context-menu-actions.ts`），
 * 因此可以**逐项**配置。存"隐藏了哪些 key"而不是"每一项的布尔值"：
 * 新增动作时缺省就是显示的，老用户的设置不需要迁移。</p>
 */
export interface ContextMenuSettings {
  /** 被隐藏的动作 key（缺省空数组 = 全部显示）。 */
  hiddenActionKeys?: string[]
}

export interface PersonalSettings {
  fontSize?: number
  layoutMode?: LayoutMode
  themeMode?: ThemeMode
  /**
   * 是否显示标签页下方的导航面包屑。
   *
   * 缺省（`undefined`）= 显示；只有用户明确关掉才写 `false`。
   * 用布尔而不是「面包屑样式枚举」：这里只有一个可切换项，多一层枚举没有信息量。
   */
  showBreadcrumb?: boolean
  /** 行右键菜单的显示偏好；缺省 = 三组全显示。 */
  contextMenu?: ContextMenuSettings
}

interface UiSettingsState {
  settings: PersonalSettings | null
  setSettings: (settings: PersonalSettings) => void
  patchSettings: (settings: PersonalSettings) => void
  setThemeMode: (mode: ThemeMode) => void
  clearSettings: () => void
}

function normalizeFontSize(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function normalizeLayoutMode(value: unknown): LayoutMode | undefined {
  return value === 'sider' || value === 'top' ? value : undefined
}

function normalizeShowBreadcrumb(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/**
 * 右键菜单偏好归一化。
 *
 * <p>只接受字符串数组；同时兼容上一版按"分组开关"存的三个布尔字段（它们曾短暂上线），
 * 把 `false` 翻译成"隐藏该组全部 key"，避免老数据读出来后又出现"开关关着但菜单还在"。</p>
 */
export function normalizeContextMenuSettings(
  value: unknown,
): ContextMenuSettings | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const candidate = value as ContextMenuSettings & {
    showRowActions?: boolean
    showBatchActions?: boolean
    showDangerActions?: boolean
  }
  const hidden = new Set<string>()
  if (Array.isArray(candidate.hiddenActionKeys)) {
    for (const key of candidate.hiddenActionKeys) {
      if (typeof key === 'string' && key.trim()) {
        hidden.add(key.trim())
      }
    }
  }
  // 旧字段迁移：分组关掉 = 该组 key 全部隐藏
  if (candidate.showRowActions === false) {
    for (const key of contextMenuActionKeysByGroup('row')) hidden.add(key)
  }
  if (candidate.showBatchActions === false) {
    for (const key of contextMenuActionKeysByGroup('bulk')) hidden.add(key)
  }
  if (candidate.showDangerActions === false) {
    for (const action of CONTEXT_MENU_ACTIONS) {
      if (action.danger) hidden.add(action.key)
    }
  }
  return hidden.size > 0 ? { hiddenActionKeys: [...hidden] } : undefined
}

function normalizeThemeMode(value: unknown): ThemeMode | undefined {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : undefined
}

export function normalizePersonalSettings(
  value: unknown,
): PersonalSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as PersonalSettings
  const settings: PersonalSettings = {}
  const fontSize = normalizeFontSize(candidate.fontSize)
  const layoutMode = normalizeLayoutMode(candidate.layoutMode)
  const themeMode = normalizeThemeMode(candidate.themeMode)
  const showBreadcrumb = normalizeShowBreadcrumb(candidate.showBreadcrumb)

  if (fontSize !== undefined) {
    settings.fontSize = fontSize
  }
  if (layoutMode) {
    settings.layoutMode = layoutMode
  }
  if (themeMode) {
    settings.themeMode = themeMode
  }
  if (showBreadcrumb !== undefined) {
    settings.showBreadcrumb = showBreadcrumb
  }
  const contextMenu = normalizeContextMenuSettings(candidate.contextMenu)
  if (contextMenu) {
    settings.contextMenu = contextMenu
  }

  return Object.keys(settings).length > 0 ? settings : null
}

function readPersistedPersonalSettings(
  value: unknown,
): PersonalSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  if ('settings' in value) {
    return normalizePersonalSettings((value as { settings?: unknown }).settings)
  }

  if ('state' in value) {
    const state = (value as { state?: unknown }).state
    if (state && typeof state === 'object' && 'settings' in state) {
      return normalizePersonalSettings(
        (state as { settings?: unknown }).settings,
      )
    }
  }

  return normalizePersonalSettings(value)
}

function mergePersistedState(
  persistedState: unknown,
  currentState: UiSettingsState,
): UiSettingsState {
  return {
    ...currentState,
    settings: readPersistedPersonalSettings(persistedState),
  }
}

const personalSettingsStorage: PersistStorage<
  Pick<UiSettingsState, 'settings'>
> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return {
          state: {
            settings: readPersistedPersonalSettings(parsed),
          },
          version:
            typeof parsed.version === 'number' ? parsed.version : undefined,
        }
      }

      return {
        state: {
          settings: normalizePersonalSettings(parsed),
        },
        version: 1,
      }
    } catch {
      localStorage.removeItem(name)
      return null
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
  },
}

export const useUiSettingsStore = create<UiSettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      setSettings: (settings) => {
        set({ settings: normalizePersonalSettings(settings) })
      },
      patchSettings: (settings) => {
        const merged = {
          ...(get().settings ?? {}),
          ...settings,
        }
        set({ settings: normalizePersonalSettings(merged) })
      },
      setThemeMode: (mode) => {
        get().patchSettings({ themeMode: mode })
      },
      clearSettings: () => {
        set({ settings: null })
      },
    }),
    {
      name: STORAGE_KEYS.personalSettings,
      storage: personalSettingsStorage,
      version: 1,
      partialize: (state) => ({ settings: state.settings }),
      merge: mergePersistedState,
    },
  ),
)
