import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'
import {
  getStoredPersonalSettings,
  useUiSettingsStore,
} from './uiSettingsStore'

describe('uiSettingsStore', () => {
  afterEach(() => {
    useUiSettingsStore.setState({ settings: null })
    useUiSettingsStore.persist.clearStorage()
  })

  beforeEach(() => {
    localStorage.clear()
    useUiSettingsStore.setState({ settings: null })
    useUiSettingsStore.persist.clearStorage()
  })

  it('starts without saved personal settings', () => {
    expect(useUiSettingsStore.getState().settings).toBeNull()
  })

  it('reads null when no personal settings are stored', () => {
    expect(getStoredPersonalSettings()).toBeNull()
  })

  it('persists partial theme settings', () => {
    useUiSettingsStore.getState().setThemeMode('dark')

    expect(useUiSettingsStore.getState().settings).toEqual({
      themeMode: 'dark',
    })
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toContain(
      'themeMode',
    )
  })

  it('persists complete personal settings', () => {
    useUiSettingsStore.getState().setSettings({
      fontSize: 16,
      layoutMode: 'sider',
      themeMode: 'light',
    })

    expect(useUiSettingsStore.getState().settings).toEqual({
      fontSize: 16,
      layoutMode: 'sider',
      themeMode: 'light',
    })
  })

  it('ignores invalid field values', () => {
    useUiSettingsStore.getState().setSettings({
      fontSize: Number.NaN,
      layoutMode: 'bad' as never,
      themeMode: 'bad' as never,
    })

    expect(useUiSettingsStore.getState().settings).toBeNull()
  })

  it('rehydrates legacy raw personal settings JSON', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        fontSize: 18,
        layoutMode: 'top',
        themeMode: 'system',
      }),
    )

    useUiSettingsStore.persist.rehydrate()

    expect(useUiSettingsStore.getState().settings).toEqual({
      fontSize: 18,
      layoutMode: 'top',
      themeMode: 'system',
    })
  })

  it('reads legacy raw personal settings JSON directly', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        fontSize: 18,
        layoutMode: 'top',
        themeMode: 'system',
      }),
    )

    expect(getStoredPersonalSettings()).toEqual({
      fontSize: 18,
      layoutMode: 'top',
      themeMode: 'system',
    })
  })

  it('recovers invalid persisted personal settings', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        state: { settings: { themeMode: 'blue' } },
        version: 1,
      }),
    )

    useUiSettingsStore.persist.rehydrate()

    expect(useUiSettingsStore.getState().settings).toBeNull()
  })

  it('rehydrates persisted settings without version', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        state: { settings: { themeMode: 'dark' } },
      }),
    )

    useUiSettingsStore.persist.rehydrate()

    expect(useUiSettingsStore.getState().settings).toEqual({
      themeMode: 'dark',
    })
  })

  it('recovers persisted settings with invalid state wrapper', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({
        state: null,
        version: 1,
      }),
    )

    useUiSettingsStore.persist.rehydrate()

    expect(useUiSettingsStore.getState().settings).toBeNull()
  })

  it('recovers broken persisted JSON during rehydrate', () => {
    localStorage.setItem(STORAGE_KEYS.personalSettings, '{broken}')

    useUiSettingsStore.persist.rehydrate()

    expect(useUiSettingsStore.getState().settings).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toBeNull()
  })

  it('removes broken personal settings JSON when read directly', () => {
    localStorage.setItem(STORAGE_KEYS.personalSettings, '{broken}')

    expect(getStoredPersonalSettings()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toBeNull()
  })

  it('clears persisted personal settings', () => {
    useUiSettingsStore.getState().setSettings({ themeMode: 'dark' })

    useUiSettingsStore.getState().clearSettings()

    expect(useUiSettingsStore.getState().settings).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.personalSettings)).toContain(
      '"settings":null',
    )
  })
})
