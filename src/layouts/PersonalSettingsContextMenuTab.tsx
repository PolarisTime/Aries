import { Button, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ContextMenuSettings } from '@/stores/uiSettingsStore'

interface Props {
  /** 当前（草稿）右键菜单偏好；三项都是"缺省显示"。 */
  contextMenu: Required<ContextMenuSettings>
  onContextMenuChange: (patch: ContextMenuSettings) => void
  onReset: () => void
  onSave: () => void
}

/**
 * 个人设置 → 右键菜单。
 *
 * <p>列表页的行右键菜单项来自各模块的动作定义（查看 / 编辑 / 审核 / 附件 / 批量删除…），
 * 全站无法逐项枚举，所以按**语义分组**给开关：行操作、批量操作、危险操作。
 * 缺省全开；关掉某组只是"不再渲染到菜单里"，对应动作仍可从可见按钮进入，
 * 因此不会让任何能力变成不可达（WCAG 2.1.1 键盘可达性不受影响）。</p>
 */
export function PersonalSettingsContextMenuTab({
  contextMenu,
  onContextMenuChange,
  onReset,
  onSave,
}: Props) {
  const { t } = useTranslation()

  const rows: Array<{
    key: keyof ContextMenuSettings
    label: string
    description: string
  }> = [
    {
      key: 'showRowActions',
      label: t('layouts.settings.contextMenuRowActions'),
      description: t('layouts.settings.contextMenuRowActionsDesc'),
    },
    {
      key: 'showBatchActions',
      label: t('layouts.settings.contextMenuBatchActions'),
      description: t('layouts.settings.contextMenuBatchActionsDesc'),
    },
    {
      key: 'showDangerActions',
      label: t('layouts.settings.contextMenuDangerActions'),
      description: t('layouts.settings.contextMenuDangerActionsDesc'),
    },
  ]

  return (
    <div className="personal-setting-panel">
      {rows.map((row) => (
        <div key={row.key} className="personal-setting-block">
          <div className="personal-setting-row">
            <span className="personal-setting-label">{row.label}</span>
            <Switch
              checked={contextMenu[row.key]}
              aria-label={row.label}
              onChange={(checked) =>
                onContextMenuChange({ [row.key]: checked })
              }
            />
          </div>
          <div className="personal-layout-mode-desc">{row.description}</div>
        </div>
      ))}

      <div className="personal-setting-actions">
        <Button onClick={onReset}>{t('layouts.settings.resetDefault')}</Button>
        <Button type="primary" onClick={onSave}>
          {t('layouts.settings.saveDisplay')}
        </Button>
      </div>
    </div>
  )
}
