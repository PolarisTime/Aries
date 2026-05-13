import type { ReactNode } from 'react'
import { useEffect } from 'react'
import AntdApp from 'antd/es/app'
import ConfigProvider from 'antd/es/config-provider'
import { appAntdLocale } from '@/config/antd-locale'
import { buildAntdTheme } from '@/styles/antd-theme'
import { bindAntdAppApi } from '@/utils/antd-app'

interface Props {
  children: ReactNode
}

function AntdAppRuntimeBridge({ children }: Props) {
  const appApi = AntdApp.useApp()

  useEffect(() => {
    bindAntdAppApi(appApi)
    return () => {
      bindAntdAppApi(null)
    }
  }, [appApi])

  return children
}

export function AppAntdProvider({ children }: Props) {
  return (
    <ConfigProvider
      locale={appAntdLocale}
      theme={buildAntdTheme({
        cssVarKey: 'aries',
        borderRadius: 8,
        fontSize: 12,
      })}
    >
      <AntdApp className="leo-antd-app">
        <AntdAppRuntimeBridge>{children}</AntdAppRuntimeBridge>
      </AntdApp>
    </ConfigProvider>
  )
}
