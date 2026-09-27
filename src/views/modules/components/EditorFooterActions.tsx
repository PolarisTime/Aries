import { AuditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  canSave: boolean
  canAudit: boolean
  auditLabel?: string
  saving: boolean
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
      {canSave && (
        <Button
          type={canAudit ? 'default' : 'primary'}
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
          type="primary"
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
