import { Form, Input, Modal, Typography } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserAccountResponse } from '@/shared/schemas'
import {
  focusFirstInvalidField,
  readAntdFormValidationErrorFields,
} from '@/utils/form-control-a11y'

interface PasswordResetFormValues {
  newPassword: string
  confirmPassword: string
}

interface Props {
  user: UserAccountResponse | null
  saving: boolean
  onSubmit: (id: string, newPassword: string) => void
  onClose: () => void
}

export function UserPasswordResetModal({
  user,
  saving,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<PasswordResetFormValues>()
  const open = Boolean(user)

  useEffect(() => {
    if (open) form.resetFields()
  }, [form, open])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (!user) return
      if (values.newPassword !== values.confirmPassword) {
        form.setFields([
          {
            name: 'confirmPassword',
            errors: [t('system.userAccount.passwordMismatch')],
          },
        ])
        form.focusField?.('confirmPassword')
        return
      }
      onSubmit(user.id, values.newPassword)
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(form, errorFields)
      }
    }
  }

  return (
    <Modal
      open={open}
      title={t('system.userAccount.resetPasswordTitle', {
        name: user?.userName || user?.loginName || '',
      })}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onOk={() => {
        void handleOk()
      }}
      onCancel={onClose}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        {t('system.userAccount.resetPasswordHint')}
      </Typography.Paragraph>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="newPassword"
          label={t('system.userAccount.newPassword')}
          rules={[
            { required: true },
            { min: 8 },
            { max: 128 },
            {
              pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
              message: t('system.userAccount.passwordStrength'),
            },
          ]}
        >
          <Input.Password
            maxLength={128}
            autoComplete="new-password"
            placeholder={t('system.userAccount.newPasswordPlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('system.userAccount.confirmPassword')}
          rules={[{ required: true }, { min: 8 }, { max: 128 }]}
        >
          <Input.Password
            maxLength={128}
            autoComplete="new-password"
            placeholder={t('system.userAccount.confirmPasswordPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
