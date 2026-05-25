import AntdApp from 'antd/es/app'
import ConfigProvider from 'antd/es/config-provider'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { appAntdLocale } from '@/config/antd-locale'
import { useThemeMode } from '@/hooks/useThemeMode'
import { buildAntdTheme } from '@/styles/antd-theme'
import { bindAntdAppApi } from '@/utils/antd-app'
import { getPersonalSettings } from '@/utils/storage'

interface Props {
  children: ReactNode
}

function readPersonalFontSize() {
  return getPersonalSettings()?.fontSize ?? 12
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
  const [fontSize, setFontSize] = useState(readPersonalFontSize)

  const handleSettingsChanged = useCallback(() => {
    setFontSize(readPersonalFontSize())
  }, [])

  useEffect(() => {
    window.addEventListener('personal-settings-changed', handleSettingsChanged)
    return () =>
      window.removeEventListener(
        'personal-settings-changed',
        handleSettingsChanged,
      )
  }, [handleSettingsChanged])

  const themeConfig = useMemo(
    () =>
      buildAntdTheme({
        borderRadius: 8,
        cssVarKey: 'ant',
        fontSize,
        darkMode: resolvedTheme === 'dark',
      }),
    [fontSize, resolvedTheme],
  )

  return (
    <ConfigProvider locale={appAntdLocale} theme={themeConfig}>
      <AntdApp className="leo-antd-app">
        <AntdAppRuntimeBridge>{children}</AntdAppRuntimeBridge>
      </AntdApp>
    </ConfigProvider>
  )
}
