import { SafetyCertificateOutlined } from '@ant-design/icons'
import Flex from 'antd/es/flex'
import Input from 'antd/es/input'
import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from '@/utils/antd-app'

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
  title,
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOk = async (): Promise<void> => {
    if (code.length !== 6) {
      message.error(t('auth.twofactormodal.codeRequired'))
      return
    }
    setLoading(true)
    try {
      await onConfirm(code)
      setCode('')
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('auth.twofactormodal.verifyFailed'),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (): void => {
    setCode('')
    onCancel()
  }

  return (
    <Modal
      title={title ?? t('auth.twofactormodal.title')}
      open={open}
      onOk={() => {
        void handleOk()
      }}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
    >
      <Flex vertical gap={12} className="py-4">
        <Typography.Text type="secondary">
          {t('auth.twofactormodal.description')}
        </Typography.Text>
        <Input
          prefix={<SafetyCertificateOutlined className="text-black/45" />}
          placeholder={t('auth.twofactormodal.placeholder')}
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={() => {
            void handleOk()
          }}
          autoFocus
          size="large"
        />
      </Flex>
    </Modal>
  )
}
