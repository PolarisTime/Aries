import type { TFunction } from 'i18next'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ThemeMode } from '@/utils/storage'

export const fontSizeOptions = [11, 12, 13, 14, 16, 18]

export function getThemeModeOptions(
  t: TFunction,
): Array<{ value: ThemeMode; label: string }> {
  return [
    { value: 'light', label: t('layouts.settings.theme.light') },
    { value: 'dark', label: t('layouts.settings.theme.dark') },
    { value: 'system', label: t('layouts.settings.theme.system') },
  ]
}

export function getLayoutModeOptions(
  t: TFunction,
): Array<{ value: LayoutMode; label: string; description: string }> {
  return [
    {
      value: 'sider',
      label: t('layouts.settings.layout.sider'),
      description: t('layouts.settings.layout.siderDesc'),
    },
    {
      value: 'top',
      label: t('layouts.settings.layout.top'),
      description: t('layouts.settings.layout.topDesc'),
    },
  ]
}
