import { AuditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Space from 'antd/es/space'

interface Props {
  canSave: boolean
  canAudit: boolean
  saving: boolean
  onCancel: () => void
  onSave: (audit: boolean) => void
}

export function EditorFooterActions({
  canSave,
  canAudit,
  saving,
  onCancel,
  onSave,
}: Props) {
  return (
    <Space>
      <Button
        className="overlay-action-button"
        icon={<CloseOutlined />}
        onClick={onCancel}
      >
        取消
      </Button>
      {canSave && (
        <Button
          type="primary"
          className="overlay-action-button"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={() => onSave(false)}
        >
          保存
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
          保存并审核
        </Button>
      )}
    </Space>
  )
}
