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
      // 对比度需满足 WCAG 1.4.3 AA；暗色取值与 variables.css 的暗色变量保持一致
      colorTextSecondary: options.darkMode ? '#a0aec0' : 'rgba(0, 0, 0, 0.7)',
      colorTextPlaceholder: options.darkMode
        ? '#8090a2'
        : 'rgba(0, 0, 0, 0.45)',
      ...getPersonalControlHeights(options.fontSize),
    },
  }
}
