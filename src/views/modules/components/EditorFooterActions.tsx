import { Button, Space } from 'antd'
import { SaveOutlined, AuditOutlined, CloseOutlined } from '@ant-design/icons'

interface Props {
  canSave: boolean
  canAudit: boolean
  saving: boolean
  onCancel: () => void
  onSave: (audit: boolean) => void
}

export function EditorFooterActions({ canSave, canAudit, saving, onCancel, onSave }: Props) {
  return (
    <Space>
      <Button icon={<CloseOutlined />} onClick={onCancel}>
        取消
      </Button>
      {canSave && (
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={() => onSave(false)}
        >
          保存
        </Button>
      )}
      {canAudit && (
        <Button
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
