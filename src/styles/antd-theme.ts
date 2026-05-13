import type { ThemeConfig } from 'antd'
import { getPersonalControlHeights } from '@/layouts/usePersonalSettings'

const ANT_DESIGN_FONT_FAMILY =
  '"PingFang Intranet", "PingFang SC", "Microsoft YaHei", sans-serif'

interface BuildAntdThemeOptions {
  borderRadius: number
  cssVarKey?: string
  fontSize: number
}

export function buildAntdTheme(options: BuildAntdThemeOptions): ThemeConfig {
  return {
    ...(options.cssVarKey ? { cssVar: { key: options.cssVarKey } } : {}),
    token: {
      colorPrimary: '#2458e6',
      borderRadius: options.borderRadius,
      fontSize: options.fontSize,
      fontFamily: ANT_DESIGN_FONT_FAMILY,
      ...getPersonalControlHeights(options.fontSize),
    },
  }
}
