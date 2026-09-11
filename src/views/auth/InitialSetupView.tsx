import { KeyOutlined } from '@ant-design/icons'
import { Card, Flex, Form, Input, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { appTitle } from '@/utils/env'
import { AuthPageShell } from '@/views/auth/AuthPageShell'
import { InitialSetupAccountForm } from '@/views/auth/InitialSetupAccountForm'
import {
  SETUP_TOKEN_PATTERN,
  useInitialSetupState,
} from '@/views/auth/useInitialSetupState'

export function InitialSetupView() {
  const { t } = useTranslation()
  const { checking, form, handleSubmitAccount, loadingAccount, status } =
    useInitialSetupState()

  // antd App/ConfigProvider 已由 main.tsx 的根级 AppAntdProvider 提供。
  if (checking) {
    return (
      <Flex align="center" justify="center" className="min-h-screen">
        <Spin size="large" description={t('auth.initialsetup.checking')} />
      </Flex>
    )
  }

  if (status && !status.setupRequired) {
    return (
      <Flex align="center" justify="center" className="min-h-screen p-6">
        <AppResult
          className="app-result--page"
          status="success"
          title={t('auth.initialsetup.completedTitle')}
        />
      </Flex>
    )
  }

  return (
    <AuthPageShell>
      <Card
        className="login-form-card initial-setup-workspace"
        variant="outlined"
      >
        <Space orientation="vertical" size="large" className="w-full">
          <Space orientation="vertical" size={4} className="w-full text-center">
            <Typography.Title level={2} className="m-0">
              {appTitle}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('auth.initialsetup.guideTitle')}
            </Typography.Text>
          </Space>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              accountUserName: t('auth.initialsetup.defaultAccountUserName'),
            }}
          >
            <Form.Item
              name="setupToken"
              label={t('auth.initialsetup.setupTokenLabel')}
              rules={[
                {
                  required: true,
                  message: t('auth.initialsetup.setupTokenRequired'),
                },
                {
                  pattern: SETUP_TOKEN_PATTERN,
                  message: t('auth.initialsetup.setupTokenInvalid'),
                },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder={t('auth.initialsetup.setupTokenPlaceholder')}
                autoComplete="off"
              />
            </Form.Item>
            <InitialSetupAccountForm
              loadingAccount={loadingAccount}
              onSubmitAccount={() => {
                void handleSubmitAccount()
              }}
            />
          </Form>
        </Space>
      </Card>
    </AuthPageShell>
  )
}
