import { useNavigate } from '@tanstack/react-router'
import { Card, Form } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRequestError } from '@/hooks/useRequestError'
import type { LoginPayload } from '@/shared/schemas'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import { AuthPageShell } from './AuthPageShell'
import { LoginPasswordForm } from './LoginPasswordForm'
import { buildPostLoginTarget } from './login-view-utils'

export function LoginView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const { showError } = useRequestError()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const handleLogin = async (values: LoginPayload) => {
    setLoading(true)
    try {
      await signIn(values)
      message.success(t('auth.loginSuccess'))
      await navigate({ to: buildPostLoginTarget() })
    } catch (err) {
      showError(err, t('auth.loginFailed'))
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setLoading(false)
  }
  return (
    <AuthPageShell>
      <Card className="login-form-card" variant="outlined">
        <LoginPasswordForm
          loading={loading}
          onSubmit={(values) => {
            void handleLogin(values)
          }}
          savedLoginName=""
          form={form}
        />
      </Card>
    </AuthPageShell>
  )
}
