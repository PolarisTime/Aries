import { type ThemeConfig, theme } from 'antd'
import { getPersonalControlHeights } from '@/layouts/usePersonalSettings'

const ANT_DESIGN_FONT_FAMILY = '"PingFang SC"'

interface BuildAntdThemeOptions {
  borderRadius: number
  cssVarKey?: string
  fontSize: number
  darkMode?: boolean
}

export function buildAntdTheme(options: BuildAntdThemeOptions): ThemeConfig {
  return {
    ...(options.cssVarKey ? { cssVar: { key: options.cssVarKey } } : {}),
    algorithm: options.darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      borderRadius: options.borderRadius,
      fontSize: options.fontSize,
      fontFamily: ANT_DESIGN_FONT_FAMILY,
      fontFamilyCode: ANT_DESIGN_FONT_FAMILY,
      ...getPersonalControlHeights(options.fontSize),
    },
  }
}
