import Flex from 'antd/es/flex'
import Layout from 'antd/es/layout'
import Typography from 'antd/es/typography'
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
      <Layout className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Flex
          vertical
          align="center"
          justify="center"
          className="min-h-screen px-6 py-12"
        >
          {hero || (
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center size-14 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-400 text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                L
              </div>
              <Typography.Title level={3} className="!mb-1">
                {appTitle}
              </Typography.Title>
              <Typography.Text type="secondary">{t('common.brandSubtitle')}</Typography.Text>
            </div>
          )}
          {children}
        </Flex>
      </Layout>
    </AppAntdProvider>
  )
}
