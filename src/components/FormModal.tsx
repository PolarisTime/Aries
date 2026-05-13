import Modal from 'antd/es/modal'
import type { ModalProps } from 'antd/es/modal'
import type { ReactNode } from 'react'

interface Props {
  title: string
  open: boolean
  onClose: () => void
  onSave?: () => void
  confirmLoading?: boolean
  width?: number
  okText?: string
  cancelText?: string
  danger?: boolean
  children: ReactNode
  footer?: ModalProps['footer']
}

export function FormModal({
  title,
  open,
  onClose,
  onSave,
  confirmLoading = false,
  width = 640,
  okText = '保存',
  cancelText = '取消',
  danger = false,
  children,
  footer,
}: Props) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={onSave}
      confirmLoading={confirmLoading}
      width={width}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={danger ? { danger: true } : undefined}
      maskClosable={false}
      forceRender
      footer={footer}
    >
      {children}
    </Modal>
  )
}
