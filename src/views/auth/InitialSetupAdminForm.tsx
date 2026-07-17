import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  loadingAdmin: boolean
  onSubmitAdmin: () => void
}

export function InitialSetupAdminForm({ loadingAdmin, onSubmitAdmin }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <Form.Item
        name="adminLoginName"
        label={t('auth.initialsetup.admin.loginNameLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.admin.loginNameRequired'),
          },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.admin.loginNamePlaceholder')}
          autoFocus
        />
      </Form.Item>
      <Form.Item
        name="adminPassword"
        label={t('auth.initialsetup.admin.passwordLabel')}
        rules={[
          {
            required: true,
            min: 8,
            message: t('auth.initialsetup.admin.passwordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.initialsetup.admin.passwordPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="adminConfirmPassword"
        label={t('auth.initialsetup.admin.confirmPasswordLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.admin.confirmPasswordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.initialsetup.admin.confirmPasswordPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="adminUserName"
        label={t('auth.initialsetup.admin.userNameLabel')}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.admin.userNamePlaceholder')}
        />
      </Form.Item>
      <Button
        type="primary"
        loading={loadingAdmin}
        onClick={onSubmitAdmin}
        block
        size="large"
      >
        {t('auth.initialsetup.admin.submit')}
      </Button>
    </>
  )
}
