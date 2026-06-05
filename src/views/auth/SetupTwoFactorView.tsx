import Card from 'antd/es/card'
import Flex from 'antd/es/flex'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { appTitle } from '@/utils/env'
import { SetupTwoFactorContent } from '@/views/auth/SetupTwoFactorContent'
import { buildSetupSecurityHighlights } from '@/views/auth/setup-two-factor-constants'
import { useSetupTwoFactorState } from '@/views/auth/useSetupTwoFactorState'
import { AuthPageShell } from './AuthPageShell'

export function SetupTwoFactorView(): React.JSX.Element {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { enabling, fetchTotpSetup, form, handleEnable, loading, totpData } =
    useSetupTwoFactorState()
  const setupSecurityHighlights = buildSetupSecurityHighlights(t)

  const currentUserName =
    user?.userName || user?.loginName || t('auth.setup2fa.currentUserFallback')
  const hero = (
    <Flex vertical gap={12}>
      <div>
        <Tag color="blue" variant="filled" className="w-fit">
          {t('auth.setup2fa.heroTag')}
        </Tag>
        <Typography.Title level={2} className="my-4 mb-2">
          {appTitle}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="mb-0">
          {t('auth.setup2fa.heroSubtitle')}
        </Typography.Paragraph>
      </div>
      <Typography.Paragraph type="secondary" className="mb-0">
        {t('auth.setup2fa.heroDescription')}
      </Typography.Paragraph>
      <Flex vertical gap={12}>
        {setupSecurityHighlights.map((item, index) => (
          <Card key={item.title} size="small">
            <Space align="start">
              <Tag color="blue" variant="filled">
                {index + 1}
              </Tag>
              <Space orientation="vertical" size={2}>
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
