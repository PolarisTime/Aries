import { Modal, Tabs } from 'antd'
import { useTranslation } from 'react-i18next'
import { PersonalSettingsContextMenuTab } from '@/layouts/PersonalSettingsContextMenuTab'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ContextMenuSettings } from '@/stores/uiSettingsStore'
import type { ThemeMode } from '@/utils/storage'
import {
  AccountPasswordPanel,
  AccountProfilePanel,
} from '@/views/system/account-panels'

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
  showBreadcrumb: boolean
  onShowBreadcrumbChange: (value: boolean) => void
  contextMenu: Required<ContextMenuSettings>
  onContextMenuChange: (patch: ContextMenuSettings) => void
  onResetContextMenu: () => void
  onSaveContextMenu: () => void
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
  showBreadcrumb,
  onThemeModeChange,
  onShowBreadcrumbChange,
  contextMenu,
  onContextMenuChange,
  onResetContextMenu,
  onSaveContextMenu,
}: Props) {
  const { t } = useTranslation()

  return (
    <Modal
      key={String(open)}
      title={t('layouts.personalSettings.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      mask={{ closable: false }}
    >
      <Tabs
        items={[
          {
            key: 'display',
            label: t('layouts.personalSettings.displayTab'),
            children: (
              <PersonalSettingsDisplayTab
                fontSize={fontSize}
                layoutMode={layoutMode}
                themeMode={themeMode}
                showBreadcrumb={showBreadcrumb}
                onShowBreadcrumbChange={onShowBreadcrumbChange}
                onFontSizeChange={onFontSizeChange}
                onLayoutModeChange={onLayoutModeChange}
                onThemeModeChange={onThemeModeChange}
                onResetDisplay={onResetDisplay}
                onSaveDisplay={onSaveDisplay}
              />
            ),
          },
          {
            key: 'contextMenu',
            label: t('layouts.settings.contextMenuTab'),
            children: (
              <PersonalSettingsContextMenuTab
                contextMenu={contextMenu}
                onContextMenuChange={onContextMenuChange}
                onReset={onResetContextMenu}
                onSave={onSaveContextMenu}
              />
            ),
          },
          {
            key: 'account',
            label: t('layouts.personalSettings.accountTab'),
            children: <AccountProfilePanel />,
          },
          {
            key: 'password',
            label: t('layouts.personalSettings.passwordTab'),
            children: <AccountPasswordPanel />,
          },
        ]}
      />
    </Modal>
  )
}
