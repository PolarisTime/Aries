import { AuditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  canSave: boolean
  canAudit: boolean
  auditLabel?: string
  saving: boolean
  /**
   * 是否由「保存 / 保存并审核」充当主按钮（默认 true）。
   * 向导新建态的非末步由「下一步」充当唯一主按钮时传 false，避免同一底栏出现两个 primary 按钮。
   */
  primaryAction?: boolean
  /** 插入「取消」与「保存」之间的同排动作（如向导的「上一步 / 下一步」）。 */
  beforeSaveActions?: ReactNode
  onCancel: () => void
  onSave: (audit: boolean) => void
}

/** 与 useEditorSaveShortcuts 一致的键位提示（Windows/Linux 用 Ctrl，macOS 用 Cmd）。 */
const SAVE_SHORTCUT = 'Ctrl/Cmd + S'
const SAVE_AND_AUDIT_SHORTCUT = 'Ctrl/Cmd + Shift + S'

export function EditorFooterActions({
  canSave,
  canAudit,
  auditLabel,
  saving,
  primaryAction = true,
  beforeSaveActions,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation()
  return (
    <Space>
      <Button
        className="overlay-action-button"
        icon={<CloseOutlined />}
        disabled={saving}
        onClick={onCancel}
      >
        {t('modules.editorFooter.cancel')}
      </Button>
      {beforeSaveActions}
      {canSave && (
        <Button
          type={primaryAction && !canAudit ? 'primary' : 'default'}
          className="overlay-action-button"
          icon={<SaveOutlined />}
          loading={saving}
          aria-keyshortcuts="Control+S Meta+S"
          title={t('modules.editorFooter.saveShortcutTitle', {
            shortcut: SAVE_SHORTCUT,
          })}
          onClick={() => onSave(false)}
        >
          {t('modules.editorFooter.save')}
        </Button>
      )}
      {canAudit && (
        <Button
          type={primaryAction ? 'primary' : 'default'}
          className="overlay-action-button"
          icon={<AuditOutlined />}
          loading={saving}
          aria-keyshortcuts="Control+Shift+S Meta+Shift+S"
          title={t('modules.editorFooter.saveAndAuditShortcutTitle', {
            shortcut: SAVE_AND_AUDIT_SHORTCUT,
          })}
          onClick={() => onSave(true)}
        >
          {auditLabel ?? t('modules.editorFooter.saveAndAudit')}
        </Button>
      )}
    </Space>
  )
}
