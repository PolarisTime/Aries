import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Button, Checkbox, Form, Input } from 'antd'
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
  return (
    <div>
      <div className="login-step-tag is-password">
        <LockOutlined />
        账号密码验证
      </div>
      <h2 className="login-form-title">登录系统</h2>
      <p className="login-form-desc">
        输入账号密码后进入系统；如账户启用了二次验证，将自动进入下一步校验。
      </p>

      <Form
        form={form}
        onFinish={onSubmit}
        initialValues={{ loginName: savedLoginName, remember: true }}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="loginName"
          label="登录名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="请输入用户名"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="登录密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入密码"
            autoComplete="current-password"
          />
        </Form.Item>

        {shouldShowCaptcha && (
          <Form.Item
            name="captchaCode"
            label="图形验证码"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Input
              prefix={<SafetyCertificateOutlined />}
              placeholder="请输入验证码"
              suffix={
                <Button
                  type="text"
                  size="small"
                  onClick={onLoadCaptcha}
                  style={{ padding: 0, height: 32 }}
                >
                  {captchaImageSrc ? (
                    <img
                      src={captchaImageSrc}
                      alt="验证码"
                      style={{ height: 28, borderRadius: 4 }}
                    />
                  ) : (
                    '刷新'
                  )}
                </Button>
              }
            />
          </Form.Item>
        )}

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>记住登录状态</Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="login-submit-btn"
          >
            登录系统
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
