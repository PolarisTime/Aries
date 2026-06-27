import { Modal, Tabs } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import { PersonalSettingsSecurityTab } from '@/layouts/PersonalSettingsSecurityTab'
import { usePersonalSecuritySettings } from '@/layouts/usePersonalSecuritySettings'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import { useAuthStore } from '@/stores/authStore'
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
  const [tab, setTab] = useState('display')
  const user = useAuthStore((state) => state.user)
  const {
    handleChangePassword,
    handleEnableTotp,
    handleSetupTotp,
    pwForm,
    pwSaving,
    totpCode,
    totpEnabling,
    totpLoading,
    totpSetup,
    setTotpCode,
  } = usePersonalSecuritySettings({ open, tab })

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
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'display', label: t('layouts.personalSettings.displayTab') },
          { key: 'security', label: t('layouts.personalSettings.securityTab') },
        ]}
      />

      {tab === 'display' ? (
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
      ) : (
        <PersonalSettingsSecurityTab
          user={user}
          pwForm={pwForm}
          pwSaving={pwSaving}
          totpLoading={totpLoading}
          totpSetup={totpSetup}
          totpCode={totpCode}
          totpEnabling={totpEnabling}
          onChangePassword={(values) => {
            void handleChangePassword(values)
          }}
          onSetupTotp={() => {
            void handleSetupTotp()
          }}
          onSetTotpCode={setTotpCode}
          onEnableTotp={() => {
            void handleEnableTotp()
          }}
        />
      )}
    </Modal>
  )
}
