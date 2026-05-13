import Card from 'antd/es/card'
import Flex from 'antd/es/flex'
import Form from 'antd/es/form'
import Result from 'antd/es/result'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Steps from 'antd/es/steps'
import Typography from 'antd/es/typography'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import { appTitle } from '@/utils/env'
import { InitialSetupAdminForm } from '@/views/auth/InitialSetupAdminForm'
import { InitialSetupCompanyForm } from '@/views/auth/InitialSetupCompanyForm'
import { useInitialSetupState } from '@/views/auth/useInitialSetupState'

export function InitialSetupView() {
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
    <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
      <Spin size="large" tip="正在检查初始化状态..." />
    </Flex>
  ) : status && !status.setupRequired ? (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: 24 }}
    >
      <Result status="success" title="系统已完成初始化" />
    </Flex>
  ) : (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        padding: 24,
        background:
          'radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 26%), linear-gradient(135deg, #eef4fb 0%, #f8fafc 55%, #e8eff8 100%)',
      }}
    >
      <Card style={{ width: 'min(100%, 720px)' }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space
            orientation="vertical"
            size={4}
            style={{ width: '100%', textAlign: 'center' }}
          >
            <Typography.Title level={2} style={{ margin: 0 }}>
              {appTitle}
            </Typography.Title>
            <Typography.Text type="secondary">系统初始化向导</Typography.Text>
          </Space>
          <Steps
            current={currentStep === 'admin' ? 0 : 1}
            items={[{ title: '管理员配置' }, { title: '公司主体配置' }]}
            style={{ marginBottom: 8 }}
          />
          <Form
            form={form}
            layout="vertical"
            initialValues={{ adminUserName: '系统管理员', taxRate: 0.13 }}
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
