import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/constants/storage'

export type ThemeMode = 'light' | 'dark' | 'system'
export type LayoutMode = 'sider' | 'top'

export interface PersonalSettings {
  fontSize?: number
  layoutMode?: LayoutMode
  themeMode?: ThemeMode
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

  if (fontSize !== undefined) {
    settings.fontSize = fontSize
  }
  if (layoutMode) {
    settings.layoutMode = layoutMode
  }
  if (themeMode) {
    settings.themeMode = themeMode
  }

  return Object.keys(settings).length > 0 ? settings : null
}

function readPersistedPersonalSettings(value: unknown): PersonalSettings | null {
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

export function getStoredPersonalSettings(): PersonalSettings | null {
  const raw = localStorage.getItem(STORAGE_KEYS.personalSettings)
  if (!raw) {
    return null
  }

  try {
    return readPersistedPersonalSettings(JSON.parse(raw))
  } catch {
    localStorage.removeItem(STORAGE_KEYS.personalSettings)
    return null
  }
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
