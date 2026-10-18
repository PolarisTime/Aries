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

/**
 * 正文级语义文字色（浅色主题），每项都对其对应 `colorXxxBg` 底色实测 ≥4.5:1。
 *
 * <p><b>为什么必须显式覆盖、不能再依赖 antd 的 `colorXxxText`</b>：antd 6 的
 * `genColorMapToken` 里 `colorWarningText = warningColors[9]`，而默认主题的
 * `generateColorPalettes` 把 `9` 映射回 `colors[5]` —— 也就是**基础色本身**
 * （`8`/`9`/`10` 全部取自 `colors[4]/[5]/[6]`）。v5 中 `*Text` 表示"同色系更深一档、
 * 可作正文"，v6 已退化为基础色。</p>
 *
 * <p>后果：`var(--ant-color-warning-text)` 实测解析为 `#faad14`（而不是历史兜底
 * `#874d00`），金标签文字对 `#fffbe6` 底只有 **1.82:1**；`StatusTag` 原本正是靠这个
 * token 做对比度修复，因此 inline style 写进去的就是基础色，修复被静默废掉。</p>
 *
 * <p>取值依据（WCAG 相对亮度公式实测，底色取 antd 的 `colorXxxBg`）：
 * warning `#874d00`/`#fffbe6` = 6.53:1；success `#237804`/`#f6ffed` = 5.44:1；
 * error `#b32430`/`#fff2f0` = 5.98:1；info `#0958d9`/`#e6f4ff` = 5.50:1。</p>
 */
const STATUS_TEXT_COLORS_LIGHT = {
  colorWarningText: '#874d00',
  colorSuccessText: '#237804',
  colorErrorText: '#b32430',
  colorInfoText: '#0958d9',
} as const

/** 深色主题：底色为深色，文字反向提亮（与 variables.css 暗色变量保持一致）。 */
const STATUS_TEXT_COLORS_DARK = {
  colorWarningText: '#ffc53d',
  colorSuccessText: '#73d13d',
  colorErrorText: '#ff7875',
  colorInfoText: '#69b1ff',
} as const

/**
 * antd preset filled Tag 的文字色（取全局 token 的 `${colorKey}7`）。
 *
 * <p>上游默认值本身不达 AA：gold-7 `#d48806` 对 `#fffbe6` 仅 **2.76:1**、
 * green-7 `#389e0d` 对 `#f6ffed` 仅 **3.37:1**、orange-7 `#d46b08` 对 `#fff7e6` 仅
 * **3.34:1**。这里把常用 preset 全部锁到"对其 `*Bg` 底 ≥4.5:1"的实际取值，
 * 使全站 `Tag color="gold|green|red|...` 的 filled 变体一次达标，
 * 不必每个调用点再传 `style`。</p>
 */
export const TAG_TEXT_COLOR_OVERRIDES = {
  light: {
    blue7: '#0958d9',
    cyan7: '#006d75',
    green7: '#237804',
    gold7: '#874d00',
    lime7: '#3f6600',
    orange7: '#ad4e00',
    red7: '#b32430',
    volcano7: '#ad2102',
    yellow7: '#876800',
  },
  dark: {
    blue7: '#69b1ff',
    cyan7: '#5cdbd3',
    green7: '#73d13d',
    gold7: '#ffc53d',
    lime7: '#d3f261',
    orange7: '#ffa940',
    red7: '#ff7875',
    volcano7: '#ff9c6e',
    yellow7: '#fff566',
  },
} as const

export function buildAntdTheme(options: BuildAntdThemeOptions): ThemeConfig {
  const statusTextColors = options.darkMode
    ? STATUS_TEXT_COLORS_DARK
    : STATUS_TEXT_COLORS_LIGHT
  const tagTextColors = options.darkMode
    ? TAG_TEXT_COLOR_OVERRIDES.dark
    : TAG_TEXT_COLOR_OVERRIDES.light

  return {
    ...(options.cssVarKey ? { cssVar: { key: options.cssVarKey } } : {}),
    algorithm: options.darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      borderRadius: options.borderRadius,
      fontSize: options.fontSize,
      fontFamily: ANT_DESIGN_FONT_FAMILY,
      fontFamilyCode: ANT_DESIGN_FONT_FAMILY,
      /*
       * 展开类动效提速: antd 默认 fast=.1s / mid=.2s, 下拉、气泡、浮层都走 mid ——
       * 0.2s 再叠上 zoom 起手, 频繁开关时主观上是"慢半拍"。这里只收快 fast/mid 两档,
       * Modal/Drawer 用的 slow 保持默认: 大面板的展开幅度大, 收太快反而发飘。
       */
      motionDurationFast: '0.08s',
      motionDurationMid: '0.12s',
      // 对比度需满足 WCAG 1.4.3 AA；暗色取值与 variables.css 的暗色变量保持一致。
      // 0.65 的次要文字对白底为 5.74:1（原 0.45 的三级文字只有 3.36:1，不达 AA）。
      colorTextSecondary: options.darkMode ? '#a0aec0' : 'rgba(0, 0, 0, 0.65)',
      /*
       * 占位符也要满足 WCAG 1.4.3 AA（表单里占位符承担"该填什么"的说明职责）。
       * antd 默认 0.45 alpha 对白底仅 3.36:1；提到 0.55（4.74:1），
       * 仍明显浅于正文 0.88，视觉层级不变。
       */
      colorTextPlaceholder: options.darkMode
        ? '#8090a2'
        : 'rgba(0, 0, 0, 0.55)',
      /*
       * 链接色：antd 的 `colorLink` 取 `colorInfo` 调色板的 `colors[5]`，即 #1677ff
       * （白底 4.1:1，不达 AA）。显式降到同色系深一档 #0958d9（6.16:1）。
       * 页签激活态、`Typography.Link`、表格单号链接都经过这个 token。
       */
      colorLink: options.darkMode ? '#85b3ff' : '#0958d9',
      colorLinkHover: options.darkMode ? '#a8c8ff' : '#0d63d6',
      colorLinkActive: options.darkMode ? '#6ba3ff' : '#003eb3',
      /*
       * 三级/描述性文字：antd 默认 0.45 alpha（白底 3.36:1）低于 AA 4.5:1。
       * 统计卡标题、面包屑可点项、说明文字都用这两档，因此一并提到 0.65（5.74:1）。
       * 这是全局 token，覆盖后无需逐组件补丁。
       */
      colorTextTertiary: options.darkMode ? '#8f9bab' : 'rgba(0, 0, 0, 0.65)',
      colorTextDescription: options.darkMode
        ? '#8f9bab'
        : 'rgba(0, 0, 0, 0.65)',
      ...statusTextColors,
      ...getPersonalControlHeights(options.fontSize),
    },
    components: {
      Tag: tagTextColors,
      /*
       * 页签激活文字 / 选中菜单项：antd 这两个组件的 `itemSelectedColor` 都直接取
       * `colorPrimary`(#1677ff)，白底 4.1:1 不达 AA。组件级把它换成深一档
       * #0958d9（6.16:1）。inkBar（页签下划线）与背景仍走 colorPrimary，
       * 视觉主色不变，只有文字变深。
       */
      Tabs: {
        itemSelectedColor: options.darkMode ? '#85b3ff' : '#0958d9',
        itemHoverColor: options.darkMode ? '#a8c8ff' : '#0d63d6',
        itemActiveColor: options.darkMode ? '#6ba3ff' : '#003eb3',
      },
      Menu: {
        itemSelectedColor: options.darkMode ? '#85b3ff' : '#0958d9',
        itemHoverColor: options.darkMode ? '#a8c8ff' : '#0d63d6',
        horizontalItemSelectedColor: options.darkMode ? '#85b3ff' : '#0958d9',
        horizontalItemHoverColor: options.darkMode ? '#a8c8ff' : '#0d63d6',
      },
    },
  }
}
