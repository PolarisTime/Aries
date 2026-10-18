import { describe, expect, it } from 'vitest'
import { buildAntdTheme, TAG_TEXT_COLOR_OVERRIDES } from './antd-theme'

/**
 * 对比度契约（WCAG 1.4.3 Contrast Minimum，AA）。
 *
 * <p><b>为什么这些断言值得写</b>：仓库里曾有过一次"看起来修了、其实从未生效"的
 * 对比度修复 —— `StatusTag` 写了
 * `color: var(--ant-color-warning-text, #874d00)`，语义上完全正确，但 antd 6 的
 * `genColorMapToken` 把 `colorWarningText` 映射到 `warningColors[9]`，而默认主题的
 * `generateColorPalettes` 又把 `9` 映射回 `colors[5]` —— **就是基础色本身**。
 * 于是该 token 实测等于 `#faad14`（而非 fallback 的 `#874d00`），金标签文字对
 * `#fffbe6` 底只有 1.82:1。没有测试盯着，这类"引用了正确名字、拿到了错误值"的
 * 缺陷不可能被发现。</p>
 *
 * <p>下面按 WCAG 相对亮度公式直接算对比度，锁住"文字色 vs 其对应底色 ≥4.5:1"。</p>
 */

/** WCAG 2.x 相对亮度。 */
function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => {
    const value =
      Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG 对比度（1~21）。 */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

const AA_NORMAL_TEXT = 4.5

/** antd 各语义色的 filled 底色（`colorXxxBg`）。 */
const TAG_BACKGROUNDS = {
  gold: '#fffbe6',
  green: '#f6ffed',
  red: '#fff2f0',
  blue: '#e6f4ff',
  orange: '#fff7e6',
  volcano: '#fff2f0',
  yellow: '#feffe6',
  lime: '#fcffe6',
  cyan: '#e6fffb',
} as const

describe('状态标签文字色对比度', () => {
  it('每个 preset filled Tag 的文字色对其底色都 ≥4.5:1（AA 正文）', () => {
    for (const [color, background] of Object.entries(TAG_BACKGROUNDS)) {
      const textColor =
        TAG_TEXT_COLOR_OVERRIDES.light[
          `${color}7` as keyof typeof TAG_TEXT_COLOR_OVERRIDES.light
        ]
      expect(textColor, `${color}7 未覆盖`).toBeTruthy()
      const ratio = contrastRatio(textColor, background)
      expect(
        ratio,
        `${color} 标签 ${textColor} 对 ${background} 仅 ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    }
  })

  it('不改回 antd 的 colorXxxText token（它在 antd 6 等于基础色，只有 1.82:1）', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    const token = theme.token

    // 这些值必须显式覆盖；若哪天被删掉，antd 会退回基础色 #faad14 等危险值
    expect(token?.colorWarningText).toBe('#874d00')
    expect(token?.colorSuccessText).toBe('#237804')
    expect(token?.colorErrorText).toBe('#b32430')
    expect(token?.colorInfoText).toBe('#0958d9')

    // 关键回归：绝不能是 antd 的基础语义色（白底/浅底上都不达 AA）
    expect(token?.colorWarningText).not.toBe('#faad14')
    expect(token?.colorSuccessText).not.toBe('#52c41a')
  })
})

describe('正文级文字色对比度', () => {
  it('链接色对白底 ≥4.5:1（原 #1677ff 只有 4.1:1）', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    const linkColor = theme.token?.colorLink
    expect(linkColor).toBe('#0958d9')
    expect(contrastRatio(linkColor!, '#ffffff')).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    )
  })

  it('三级/说明性文字不再是 antd 默认的 0.45 alpha（白底 3.36:1）', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    // 0.65 alpha 黑对白底约 5.74:1；0.45 只有 3.36:1
    expect(theme.token?.colorTextTertiary).toBe('rgba(0, 0, 0, 0.65)')
    expect(theme.token?.colorTextDescription).toBe('rgba(0, 0, 0, 0.65)')
  })

  it('占位符不再是 0.45 alpha（表单说明职责要求可读）', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(theme.token?.colorTextPlaceholder).toBe('rgba(0, 0, 0, 0.55)')
  })

  it('页签/菜单选中文字对白底 ≥4.5:1（antd 默认取 colorPrimary = 4.1:1）', () => {
    const theme = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    const tabsSelected = theme.components?.Tabs?.itemSelectedColor
    const menuSelected = theme.components?.Menu?.itemSelectedColor
    expect(tabsSelected).toBe('#0958d9')
    expect(menuSelected).toBe('#0958d9')
    expect(contrastRatio(tabsSelected!, '#ffffff')).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    )
  })
})

describe('对比度工具自检', () => {
  it('明暗极值符合 WCAG 定义（白/黑 = 21:1，同色 = 1:1）', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('能复现审查里记录的真实失败值', () => {
    // #faad14 on #fffbe6 = 1.82:1（本次修复前金标签的真实读数）
    expect(contrastRatio('#faad14', '#fffbe6')).toBeCloseTo(1.82, 1)
    // #1677ff on #ffffff = 4.1:1
    expect(contrastRatio('#1677ff', '#ffffff')).toBeCloseTo(4.1, 1)
    // #8c8c8c on #ffffff = 3.36:1
    expect(contrastRatio('#8c8c8c', '#ffffff')).toBeCloseTo(3.36, 1)
  })
})
