import Modal from 'antd/es/modal'
import Tabs from 'antd/es/tabs'
import { useEffect, useState } from 'react'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import { PersonalSettingsSecurityTab } from '@/layouts/PersonalSettingsSecurityTab'
import { usePersonalSecuritySettings } from '@/layouts/usePersonalSecuritySettings'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  open: boolean
  onClose: () => void
  onSaveDisplay: () => void
  onResetDisplay: () => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (value: LayoutMode) => void
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
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
          { key: 'security', label: '账户安全' },
        ]}
      />

      {tab === 'display' ? (
        <PersonalSettingsDisplayTab
          fontSize={fontSize}
          layoutMode={layoutMode}
          onFontSizeChange={onFontSizeChange}
          onLayoutModeChange={onLayoutModeChange}
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
