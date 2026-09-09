import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'
import { useTranslation } from 'react-i18next'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'

interface Props {
  loadingAccount: boolean
  onSubmitAccount: () => void
}

export function InitialSetupAccountForm({
  loadingAccount,
  onSubmitAccount,
}: Props) {
  const { t } = useTranslation()

  return (
    <>
      <AccessibleFormItem
        name="accountLoginName"
        label={t('auth.initialsetup.account.loginNameLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.account.loginNameRequired'),
          },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.account.loginNamePlaceholder')}
          autoFocus
        />
      </AccessibleFormItem>
      <AccessibleFormItem
        name="accountPassword"
        label={t('auth.initialsetup.account.passwordLabel')}
        rules={[
          {
            required: true,
            min: 8,
            message: t('auth.initialsetup.account.passwordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.initialsetup.account.passwordPlaceholder')}
        />
      </AccessibleFormItem>
      <AccessibleFormItem
        name="accountConfirmPassword"
        label={t('auth.initialsetup.account.confirmPasswordLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.account.confirmPasswordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t(
            'auth.initialsetup.account.confirmPasswordPlaceholder',
          )}
        />
      </AccessibleFormItem>
      <AccessibleFormItem
        name="accountUserName"
        label={t('auth.initialsetup.account.userNameLabel')}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.account.userNamePlaceholder')}
        />
      </AccessibleFormItem>
      <Button
        type="primary"
        loading={loadingAccount}
        onClick={onSubmitAccount}
        block
        size="large"
      >
        {t('auth.initialsetup.account.submit')}
      </Button>
    </>
  )
}
