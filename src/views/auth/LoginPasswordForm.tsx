import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Checkbox, Form, Input } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { useTranslation } from 'react-i18next'
import type { LoginPayload } from '@/types/auth'

interface Props {
  loading: boolean
  onSubmit: (values: LoginPayload) => void
  savedLoginName: string
  form: FormInstance
}

export function LoginPasswordForm({
  loading,
  onSubmit,
  savedLoginName,
  form,
}: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="login-step-tag is-password">
        <LockOutlined />
        {t('auth.loginform.step')}
      </div>
      <h2 className="login-form-title">{t('auth.loginform.title')}</h2>
      <p className="login-form-desc">{t('auth.loginform.description')}</p>

      <Form
        form={form}
        onFinish={onSubmit}
        initialValues={{ loginName: savedLoginName, remember: true }}
        layout="vertical"
        size="large"
        className="login-form"
      >
        <Form.Item
          name="loginName"
          label={t('auth.loginform.loginNameLabel')}
          rules={[
            { required: true, message: t('auth.loginform.loginNameRequired') },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('auth.loginform.loginNamePlaceholder')}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('auth.loginform.passwordLabel')}
          rules={[
            { required: true, message: t('auth.loginform.passwordRequired') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('auth.loginform.passwordPlaceholder')}
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>{t('auth.loginform.remember')}</Checkbox>
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="login-submit-btn"
          >
            {t('auth.loginform.submit')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
