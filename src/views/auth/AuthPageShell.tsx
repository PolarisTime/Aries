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
  const defaultHero = (
    <div className="auth-page-brand">
      <div className="auth-page-brand-lockup">
        <div className="auth-page-brand-mark" aria-hidden="true">
          L
        </div>
        <Typography.Text className="auth-page-product-label">
          LEO ERP
        </Typography.Text>
      </div>
      <Typography.Title level={1} className="auth-page-brand-title">
        {appTitle}
      </Typography.Title>
      <Typography.Text className="auth-page-brand-subtitle">
        {t('common.brandSubtitle')}
      </Typography.Text>
      <div className="auth-page-brand-rule" aria-hidden="true" />
      <Typography.Text className="auth-page-brand-note">
        安全、清晰地连接采购、销售、仓储与财务流程
      </Typography.Text>
    </div>
  )

  return (
    <AppAntdProvider>
      <Layout className="auth-page-shell">
        <div className="auth-page-grid">
          <aside className="auth-page-visual">
            <div className="auth-page-visual-orbit" aria-hidden="true" />
            <div className="auth-page-visual-content">
              {hero || defaultHero}
            </div>
          </aside>
          <main className="auth-page-main">
            <Flex
              vertical
              align="center"
              justify="center"
              className="auth-page-content"
            >
              <div className="auth-page-panel">{children}</div>
            </Flex>
          </main>
        </div>
      </Layout>
    </AppAntdProvider>
  )
}
