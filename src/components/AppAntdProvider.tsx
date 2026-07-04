import { App as AntdApp, ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { appAntdLocale } from '@/config/antd-locale'
import { useThemeMode } from '@/hooks/useThemeMode'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
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
  const fontSize = useUiSettingsStore((state) => state.settings?.fontSize ?? 14)

  const themeConfig = buildAntdTheme({
    borderRadius: 6,
    cssVarKey: 'ant',
    fontSize,
    darkMode: resolvedTheme === 'dark',
  })

  return (
    <ConfigProvider locale={appAntdLocale} theme={themeConfig}>
      <AntdApp className="leo-antd-app">
        <AntdAppRuntimeBridge>{children}</AntdAppRuntimeBridge>
      </AntdApp>
    </ConfigProvider>
  )
}
