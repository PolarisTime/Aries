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
        onClick={onCancel}
      >
        {t('modules.editorFooter.cancel')}
      </Button>
      {canSave && (
        <Button
          type="primary"
          className="overlay-action-button"
          icon={<SaveOutlined />}
          loading={saving}
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
          onClick={() => onSave(true)}
        >
          {auditLabel ?? t('modules.editorFooter.saveAndAudit')}
        </Button>
      )}
    </Space>
  )
}
