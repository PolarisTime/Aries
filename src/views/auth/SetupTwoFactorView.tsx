import Card from 'antd/es/card'
import Flex from 'antd/es/flex'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useAuthStore } from '@/stores/authStore'
import { appTitle } from '@/utils/env'
import { SetupTwoFactorContent } from '@/views/auth/SetupTwoFactorContent'
import { setupSecurityHighlights } from '@/views/auth/setup-two-factor-constants'
import { useSetupTwoFactorState } from '@/views/auth/useSetupTwoFactorState'
import { AuthPageShell } from './AuthPageShell'

export function SetupTwoFactorView() {
  const user = useAuthStore((s) => s.user)
  const { enabling, fetchTotpSetup, form, handleEnable, loading, totpData } =
    useSetupTwoFactorState()

  const currentUserName = user?.userName || user?.loginName || '当前账户'
  const hero = (
    <Flex vertical gap={12}>
      <div>
        <Tag color="blue" variant="filled" style={{ width: 'fit-content' }}>
          Account Security
        </Tag>
        <Typography.Title level={2} style={{ margin: '16px 0 8px' }}>
          {appTitle}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          为账户启用二次验证
        </Typography.Paragraph>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        当前账户登录后仍需补齐安全绑定。认证入口统一改成 Ant Design
        组件结构，用更标准的卡片、列表和表单完成 2FA 接入。
      </Typography.Paragraph>
      <Flex vertical gap={12}>
        {setupSecurityHighlights.map((item, index) => (
          <Card key={item.title} size="small">
            <Space align="start">
              <Tag color="blue" variant="filled">
                {index + 1}
              </Tag>
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{item.title}</Typography.Text>
                <Typography.Text type="secondary">
                  {item.description}
                </Typography.Text>
              </Space>
            </Space>
          </Card>
        ))}
      </Flex>
    </Flex>
  )

  return (
    <AuthPageShell hero={hero}>
      <SetupTwoFactorContent
        currentUserName={currentUserName}
        form={form}
        loading={loading}
        enabling={enabling}
        totpData={totpData}
        onRefresh={() => {
          void fetchTotpSetup()
        }}
        onEnable={(values) => {
          void handleEnable(values)
        }}
      />
    </AuthPageShell>
  )
}
