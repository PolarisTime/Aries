import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ThemeMode } from '@/utils/storage'

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

export function PersonalSettingsModal({
  open,
  onClose,
  onSaveDisplay,
  onResetDisplay,
  fontSize,
  onFontSizeChange,
  layoutMode,
  onLayoutModeChange,
  themeMode,
  onThemeModeChange,
}: Props) {
  const { t } = useTranslation()

  return (
    <Modal
      key={String(open)}
      title={t('layouts.personalSettings.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      mask={{ closable: false }}
    >
      <PersonalSettingsDisplayTab
        fontSize={fontSize}
        layoutMode={layoutMode}
        themeMode={themeMode}
        onFontSizeChange={onFontSizeChange}
        onLayoutModeChange={onLayoutModeChange}
        onThemeModeChange={onThemeModeChange}
        onResetDisplay={onResetDisplay}
        onSaveDisplay={onSaveDisplay}
      />
    </Modal>
  )
}
