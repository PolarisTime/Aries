import type { FormInstance } from 'antd'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Modal from 'antd/es/modal'
import Upload from 'antd/es/upload'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (file: File, dbUser: string, dbPass: string) => Promise<void>
}

export function DatabaseImportBackupModal({ open, onClose, onImport }: Props) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleOk = async () => {
    if (!file) return
    const values = await form.validateFields()
    setLoading(true)
    try {
      await onImport(file, values.dbUser || '', values.dbPass || '')
      form.resetFields()
      setFile(null)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="导入数据库备份"
      open={open}
      onOk={() => { void handleOk() }}
      onCancel={onClose}
      confirmLoading={loading}
      okText="开始导入"
      cancelText="取消"
      destroyOnClose
    >
      <Alert message="导入将覆盖当前数据库，请谨慎操作" type="warning" showIcon className="mb-16" />
      <Form form={form} layout="vertical">
        <Form.Item name="file" label="备份文件" rules={[{ required: true, message: '请选择备份文件' }]}>
          <Upload
            accept=".sql,.gz,.dump"
            maxCount={1}
            beforeUpload={(f) => { setFile(f); return false }}
            onRemove={() => setFile(null)}
          >
            <Button>选择文件</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="dbUser" label="数据库用户名">
          <Input placeholder="数据库用户名" />
        </Form.Item>
        <Form.Item name="dbPass" label="数据库密码">
          <Input.Password placeholder="数据库密码" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
