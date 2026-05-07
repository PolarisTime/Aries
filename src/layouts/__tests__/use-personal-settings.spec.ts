import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'
import { usePersonalSettings } from '@/layouts/use-personal-settings'

describe('usePersonalSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--app-font-size')
  })

  it('uses top navigation as the default layout mode', () => {
    const support = usePersonalSettings()

    expect(support.layoutMode.value).toBe('top')
  })

  it('loads stored font size and applies it to the document root', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({ fontSize: 16, layoutMode: 'top' }),
    )

    const support = usePersonalSettings()

    expect(support.fontSize.value).toBe(16)
    expect(support.layoutMode.value).toBe('top')
    expect(
      document.documentElement.style.getPropertyValue('--app-font-size'),
    ).toBe('16px')
  })

  it('keeps the stored sider layout mode', () => {
    localStorage.setItem(
      STORAGE_KEYS.personalSettings,
      JSON.stringify({ fontSize: 14, layoutMode: 'sider' }),
    )

    const support = usePersonalSettings()

    expect(support.layoutMode.value).toBe('sider')
  })

  it('persists font size and closes the modal on save', () => {
    const support = usePersonalSettings({ defaultFontSize: 12 })

    support.open()
    support.fontSize.value = 18
    support.layoutMode.value = 'top'
    support.save()

    expect(support.visible.value).toBe(false)
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.personalSettings) || '{}'),
    ).toMatchObject({
      fontSize: 18,
      layoutMode: 'top',
    })
    expect(
      document.documentElement.style.getPropertyValue('--app-font-size'),
    ).toBe('18px')
  })

  it('resets font size to the configured default', () => {
    const support = usePersonalSettings({ defaultFontSize: 13 })

    support.fontSize.value = 18
    support.layoutMode.value = 'top'
    support.reset()

    expect(support.fontSize.value).toBe(13)
    expect(support.layoutMode.value).toBe('top')
  })
})
