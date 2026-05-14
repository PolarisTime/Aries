import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Checkbox from 'antd/es/checkbox'
import type { FormInstance } from 'antd/es/form'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import { useTranslation } from 'react-i18next'
import type { LoginPayload } from '@/types/auth'

interface Props {
  captchaImageSrc: string
  loading: boolean
  onLoadCaptcha: () => void
  onSubmit: (values: LoginPayload) => void
  shouldShowCaptcha: boolean
  savedLoginName: string
  form: FormInstance
}

export function LoginPasswordForm({
  captchaImageSrc,
  loading,
  onLoadCaptcha,
  onSubmit,
  shouldShowCaptcha,
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

        {shouldShowCaptcha && (
          <Form.Item
            name="captchaCode"
            label={t('auth.loginform.captchaLabel')}
            rules={[
              { required: true, message: t('auth.loginform.captchaRequired') },
            ]}
          >
            <Input
              prefix={<SafetyCertificateOutlined />}
              placeholder={t('auth.loginform.captchaPlaceholder')}
              suffix={
                <Button
                  type="text"
                  size="small"
                  onClick={onLoadCaptcha}
                  className="h-8 p-0"
                >
                  {captchaImageSrc ? (
                    <img
                      src={captchaImageSrc}
                      alt={t('auth.loginform.captchaAlt')}
                      className="h-7 rounded"
                    />
                  ) : (
                    t('auth.loginform.captchaRefresh')
                  )}
                </Button>
              }
            />
          </Form.Item>
        )}

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
