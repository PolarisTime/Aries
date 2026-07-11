import { KeyOutlined } from '@ant-design/icons'
import { Card, Flex, Form, Input, Space, Spin, Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import { AppResult } from '@/components/AppResult'
import { appTitle } from '@/utils/env'
import { AuthPageShell } from '@/views/auth/AuthPageShell'
import { InitialSetupAdminForm } from '@/views/auth/InitialSetupAdminForm'
import { InitialSetupCompanyForm } from '@/views/auth/InitialSetupCompanyForm'
import {
  SETUP_TOKEN_PATTERN,
  useInitialSetupState,
} from '@/views/auth/useInitialSetupState'

export function InitialSetupView() {
  const { t } = useTranslation()
  const {
    adminCompleted,
    checking,
    currentStep,
    form,
    handleGenerateTotp,
    handleSubmitAdmin,
    handleSubmitCompany,
    loadingAdmin,
    loadingCompany,
    loadingTotp,
    setCurrentStep,
    status,
    totpSetup,
  } = useInitialSetupState()

  if (checking) {
    return (
      <AppAntdProvider>
        <Flex align="center" justify="center" className="min-h-screen">
          <Spin size="large" description={t('auth.initialsetup.checking')} />
        </Flex>
      </AppAntdProvider>
    )
  }

  if (status && !status.setupRequired) {
    return (
      <AppAntdProvider>
        <Flex align="center" justify="center" className="min-h-screen p-6">
          <AppResult
            className="app-result--page"
            status="success"
            title={t('auth.initialsetup.completedTitle')}
          />
        </Flex>
      </AppAntdProvider>
    )
  }

  return (
    <AuthPageShell>
      <Card
        className="login-form-card initial-setup-card initial-setup-workspace"
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
          <Steps
            current={currentStep === 'admin' ? 0 : 1}
            items={[
              { title: t('auth.initialsetup.adminStep') },
              { title: t('auth.initialsetup.companyStep') },
            ]}
            className="mb-2 initial-setup-progress"
          />
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              adminUserName: t('auth.initialsetup.defaultAdminUserName'),
              taxRate: 0.13,
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
            {currentStep === 'admin' ? (
              <InitialSetupAdminForm
                totpSetup={totpSetup}
                loadingTotp={loadingTotp}
                loadingAdmin={loadingAdmin}
                onGenerateTotp={() => {
                  void handleGenerateTotp()
                }}
                onSubmitAdmin={() => {
                  void handleSubmitAdmin()
                }}
              />
            ) : (
              <InitialSetupCompanyForm
                adminCompleted={adminCompleted}
                loadingCompany={loadingCompany}
                onBack={() => setCurrentStep('admin')}
                onSubmitCompany={() => {
                  void handleSubmitCompany()
                }}
              />
            )}
          </Form>
        </Space>
      </Card>
    </AuthPageShell>
  )
}
