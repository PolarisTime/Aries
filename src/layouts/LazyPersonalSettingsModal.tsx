import { lazy, Suspense } from 'react'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ThemeMode } from '@/utils/storage'

const PersonalSettingsModal = lazy(() =>
  import('@/layouts/PersonalSettingsModal').then((m) => ({
    default: m.PersonalSettingsModal,
  })),
)

interface Props {
  open: boolean
  onClose: () => void
  onSaveDisplay: () => void
  onResetDisplay: () => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (value: LayoutMode) => void
  themeMode: ThemeMode
  onThemeModeChange: (value: ThemeMode) => void
}

export function LazyPersonalSettingsModal(props: Props) {
  if (!props.open) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <PersonalSettingsModal {...props} />
    </Suspense>
  )
}
