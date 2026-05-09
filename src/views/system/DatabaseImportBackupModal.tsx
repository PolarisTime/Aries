import type { FormInstance } from 'antd'
import { Alert, Button, Form, Input, Modal, Upload } from 'antd'

interface Props {
  open: boolean
  loading: boolean
  totpDisabled: boolean
  form: FormInstance
  selectedFile: File | null
  onSelectFile: (file: File) => void
  onSubmit: () => void
  onCancel: () => void
}

export function DatabaseImportBackupModal({
  open,
  loading,
  totpDisabled,
  form,
  selectedFile,
  onSelectFile,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <Modal
      title="导入数据库备份"
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={loading}
      okText="验证并导入"
      cancelText="取消"
      width={480}
      destroyOnHidden
      forceRender
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        title="导入前会自动备份当前数据库"
        description="请选择 .sql 格式的备份文件，并填写当前 PostgreSQL 账号密码。导入操作会覆盖当前数据，请谨慎操作。"
      />
      <Form form={form} layout="vertical">
        <Form.Item name="databaseUsername" label="数据库用户名" required>
          <Input
            disabled={loading || totpDisabled}
            placeholder="输入 PostgreSQL 用户名"
          />
        </Form.Item>
        <Form.Item name="databasePassword" label="数据库密码" required>
          <Input.Password
            disabled={loading || totpDisabled}
            placeholder="输入 PostgreSQL 密码"
          />
        </Form.Item>
        <Form.Item label="备份文件" required>
          <Upload
            beforeUpload={(file) => {
              onSelectFile(file)
              return false
            }}
            showUploadList={false}
            accept=".sql"
          >
            <Button
              loading={loading}
              disabled={totpDisabled}
              type="primary"
              danger
            >
              选择备份文件
            </Button>
          </Upload>
          <div style={{ marginTop: 8, color: 'rgba(0,0,0,0.45)' }}>
            {selectedFile?.name || '未选择文件'}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}
