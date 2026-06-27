import { Card, Flex, Form, Result, Space, Spin, Steps, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import { appTitle } from '@/utils/env'
import { InitialSetupAdminForm } from '@/views/auth/InitialSetupAdminForm'
import { InitialSetupCompanyForm } from '@/views/auth/InitialSetupCompanyForm'
import { useInitialSetupState } from '@/views/auth/useInitialSetupState'

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

  const content = checking ? (
    <Flex align="center" justify="center" className="min-h-screen">
      <Spin size="large" description={t('auth.initialsetup.checking')} />
    </Flex>
  ) : status && !status.setupRequired ? (
    <Flex align="center" justify="center" className="min-h-screen p-6">
      <Result status="success" title={t('auth.initialsetup.completedTitle')} />
    </Flex>
  ) : (
    <Flex
      align="center"
      justify="center"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_26%),linear-gradient(135deg,#eef4fb_0%,#f8fafc_55%,#e8eff8_100%)] p-6"
    >
      <Card className="w-[min(100%,720px)]">
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
            className="mb-2"
          />
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              adminUserName: t('auth.initialsetup.defaultAdminUserName'),
              taxRate: 0.13,
            }}
          >
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
    </Flex>
  )

  return <AppAntdProvider>{content}</AppAntdProvider>
}
