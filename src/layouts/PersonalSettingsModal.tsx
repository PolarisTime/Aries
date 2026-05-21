import Modal from 'antd/es/modal'
import Tabs from 'antd/es/tabs'
import { useEffect, useState } from 'react'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import { PersonalSettingsSecurityTab } from '@/layouts/PersonalSettingsSecurityTab'
import { PersonalSettingsWatermarkTab } from '@/layouts/PersonalSettingsWatermarkTab'
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
  watermarkEnabled: boolean
  watermarkContent: string
  onWatermarkEnabledChange: (value: boolean) => void
  onWatermarkContentChange: (value: string) => void
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
  watermarkEnabled,
  watermarkContent,
  onWatermarkEnabledChange,
  onWatermarkContentChange,
}: Props) {
  const [tab, setTab] = useState('display')
  const user = useAuthStore((state) => state.user)
  const {
    handleChangePassword,
    handleEnableTotp,
    handleSetupTotp,
    pwForm,
    pwSaving,
    resetSecurityState,
    totpCode,
    totpEnabling,
    totpLoading,
    totpSetup,
    setTotpCode,
  } = usePersonalSecuritySettings({ open, tab })

  useEffect(() => {
    if (!open) {
      return
    }
    setTab('display')
    resetSecurityState()
  }, [open, resetSecurityState])

  return (
    <Modal
      title="个人设置"
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
          { key: 'display', label: '显示偏好' },
          { key: 'watermark', label: '水印' },
          { key: 'security', label: '账户安全' },
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
      ) : tab === 'watermark' ? (
        <PersonalSettingsWatermarkTab
          watermarkEnabled={watermarkEnabled}
          watermarkContent={watermarkContent}
          onWatermarkEnabledChange={onWatermarkEnabledChange}
          onWatermarkContentChange={onWatermarkContentChange}
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
