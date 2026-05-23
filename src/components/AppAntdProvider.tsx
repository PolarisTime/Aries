import AntdApp from 'antd/es/app'
import ConfigProvider from 'antd/es/config-provider'
import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { appAntdLocale } from '@/config/antd-locale'
import { useThemeMode } from '@/hooks/useThemeMode'
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
  const { resolvedTheme } = useThemeMode()

  const themeConfig = useMemo(
    () =>
      buildAntdTheme({
        borderRadius: 8,
        cssVarKey: 'ant',
        fontSize: 12,
        darkMode: resolvedTheme === 'dark',
      }),
    [resolvedTheme],
  )

  return (
    <ConfigProvider locale={appAntdLocale} theme={themeConfig}>
      <AntdApp className="leo-antd-app">
        <AntdAppRuntimeBridge>{children}</AntdAppRuntimeBridge>
      </AntdApp>
    </ConfigProvider>
  )
}
