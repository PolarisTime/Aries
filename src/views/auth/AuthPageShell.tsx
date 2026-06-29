import { Flex, Layout, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import { appTitle } from '@/utils/env'

interface Props {
  children: ReactNode
  hero?: ReactNode
}

export function AuthPageShell({ children, hero }: Props) {
  const { t } = useTranslation()
  return (
    <AppAntdProvider>
      <Layout className="auth-page-shell">
        <Flex
          vertical
          align="center"
          justify="center"
          className="auth-page-content"
        >
          {hero || (
            <div className="auth-page-brand">
              <div className="auth-page-brand-mark">L</div>
              <Typography.Title level={3} className="auth-page-brand-title">
                {appTitle}
              </Typography.Title>
              <Typography.Text
                type="secondary"
                className="auth-page-brand-subtitle"
              >
                {t('common.brandSubtitle')}
              </Typography.Text>
            </div>
          )}
          {children}
        </Flex>
      </Layout>
    </AppAntdProvider>
  )
}
