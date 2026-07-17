import type { FormInstance } from 'antd'
import { Alert, Button, Divider, Flex, Form, Input, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { LoginUser } from '@/shared/schemas'

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
}

interface Props {
  user: LoginUser | null
  pwForm: FormInstance<PasswordFormValues>
  pwSaving: boolean
  onChangePassword: (values: PasswordFormValues) => void
}

export function PersonalSettingsSecurityTab({
  user,
  pwForm,
  pwSaving,
  onChangePassword,
}: Props) {
  const { t } = useTranslation()
  const displayName = user?.userName || user?.loginName || '--'
  const loginName = user?.loginName || '--'

  return (
    <Flex vertical gap={16}>
      <Alert
        showIcon
        type="info"
        title={t('auth.personalsecurity.accountTitle', {
          displayName,
          loginName,
        })}
        description={t('auth.personalsecurity.passwordHint')}
      />

      <Divider />

      <Form form={pwForm} onFinish={onChangePassword} layout="vertical">
        <Form.Item
          name="oldPassword"
          label={t('auth.personalsecurity.currentPassword')}
          rules={[
            {
              required: true,
              message: t('auth.personalsecurity.currentPasswordRequired'),
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('auth.personalsecurity.newPassword')}
          rules={[
            {
              required: true,
              min: 6,
              message: t('auth.personalsecurity.newPasswordRequired'),
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary">
            {t('auth.personalsecurity.passwordHint')}
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={pwSaving}>
            {t('auth.personalsecurity.updatePassword')}
          </Button>
        </Flex>
      </Form>
    </Flex>
  )
}
