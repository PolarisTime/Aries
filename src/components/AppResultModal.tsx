import { Modal } from 'antd'
import type { ResultProps } from 'antd/es/result'
import { AppResult } from '@/components/AppResult'

interface AppResultModalProps {
  open: boolean
  onClose: () => void
  status: ResultProps['status']
  title?: ResultProps['title']
  subTitle?: ResultProps['subTitle']
  icon?: ResultProps['icon']
  traceId?: string
  footer?: React.ReactNode
}

export function AppResultModal({
  open,
  onClose,
  status,
  title,
  subTitle,
  icon,
  traceId,
  footer,
}: AppResultModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={footer ?? null}
      width={520}
      centered
      destroyOnHidden
    >
      <AppResult
        status={status}
        title={title}
        subTitle={subTitle}
        icon={icon}
        traceId={traceId}
      />
    </Modal>
  )
}
