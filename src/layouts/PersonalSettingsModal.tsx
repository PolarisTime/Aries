import { Modal, Tabs } from 'antd'
import { useTranslation } from 'react-i18next'
import { PersonalSettingsContextMenuTab } from '@/layouts/PersonalSettingsContextMenuTab'
import { PersonalSettingsDisplayTab } from '@/layouts/PersonalSettingsDisplayTab'
import type {
  AppliedContextMenuSettings,
  LayoutMode,
} from '@/layouts/usePersonalSettings'
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
  contextMenu: AppliedContextMenuSettings
  onToggleContextMenuAction: (actionKey: string, visible: boolean) => void
  onContextMenuGroupVisibleChange: (
    group: 'row' | 'bulk',
    visible: boolean,
  ) => void
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
  onThemeModeChange,
  contextMenu,
  onToggleContextMenuAction,
  onContextMenuGroupVisibleChange,
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
                hiddenActionKeys={contextMenu.hiddenActionKeys}
                onToggleAction={onToggleContextMenuAction}
                onGroupVisibleChange={onContextMenuGroupVisibleChange}
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
