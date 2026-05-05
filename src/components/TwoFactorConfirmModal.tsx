import { Modal, Input, message } from 'antd'
import { SafetyCertificateOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface Props {
  open: boolean
  onConfirm: (code: string) => Promise<void>
  onCancel: () => void
  title?: string
}

export function TwoFactorConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = '二次验证确认',
}: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOk = async () => {
    if (code.length !== 6) {
      message.error('请输入6位验证码')
      return
    }
    setLoading(true)
    try {
      await onConfirm(code)
      setCode('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setCode('')
    onCancel()
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
    >
      <div className="py-4">
        <Input
          prefix={<SafetyCertificateOutlined className="text-gray-400" />}
          placeholder="请输入6位TOTP验证码"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={handleOk}
          autoFocus
          size="large"
        />
      </div>
    </Modal>
  )
}
