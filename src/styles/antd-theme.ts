import { type ThemeConfig, theme } from 'antd'
import { getPersonalControlHeights } from '@/layouts/usePersonalSettings'

/**
 * 与 variables.css 的 --app-font-family 保持一致: 首选捆绑/本机苹方, 其后是各平台中文黑体,
 * 避免未安装苹方的环境落到浏览器默认字体后字宽漂移(列宽/截断按苹方基准标定)。
 */
const ANT_DESIGN_FONT_FAMILY =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif'

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
