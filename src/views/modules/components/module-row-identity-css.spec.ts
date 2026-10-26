/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 首位身份列（序号 · 勾选 · 明细加号 · 行菜单）的样式契约。
 *
 * <p>锁定三件靠肉眼容易回归、jsdom 又量不出来的事：</p>
 * <ol>
 *   <li>四个控件的横向节奏（4px 等距 + 32px 序号槽）：间距再被压回 2px 就会像"一堆
 *       挤在一起的符号"；</li>
 *   <li>表头与行内共用同一套四列网格，全选复选框才会正对行复选框；</li>
 *   <li>命中区仍是 24×24（WCAG 2.2 SC 2.5.8），且不能被 `touch-targets.css` 的
 *       44px 热区补丁覆盖 —— 四个 24px 控件挤在 110px 里，44px 热区会互相覆盖 20px。</li>
 * </ol>
 */

const css = readFileSync(
  new URL('../../../styles/layout-shell.css', import.meta.url),
  'utf8',
)
const touchTargetsCss = readFileSync(
  new URL('../../../styles/touch-targets.css', import.meta.url),
  'utf8',
)

/** 取某个顶层选择器的规则体（用换行 + `{` 定位，避免命中后代选择器）。 */
const blockOf = (selector: string) => {
  const marker = `\n${selector} {`
  const index = css.indexOf(marker)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start + 1, css.indexOf('\n}', start))
}

describe('首位身份列样式契约', () => {
  it('四列固定网格 + 4px 等距: 序号 32 / 勾选 18 / 加号 24 / 菜单 24', () => {
    const block = blockOf('.module-row-identity')
    expect(block).toMatch(/display:\s*grid/)
    expect(block).toMatch(/grid-template-columns:\s*32px 18px 24px 24px/)
    expect(block).toMatch(/column-gap:\s*var\(--space-xxs\)/)
    // 列宽被浏览器摊宽时（列少、不需要横向滚动的页面）两者一起居中，不会错位
    expect(block).toMatch(/justify-content:\s*center/)
  })

  it('序号是轻徽标: 18px 高、22px 起宽、浅色圆角底 + 弱化 12px 数字', () => {
    const block = blockOf('.module-row-identity-seq')
    expect(block).toMatch(/min-width:\s*22px/)
    expect(block).toMatch(/height:\s*18px/)
    expect(block).toMatch(/background:\s*var\(--theme-surface-hover\)/)
    expect(block).toMatch(/border-radius:\s*6px/)
    expect(block).toMatch(/font-size:\s*12px/)
    expect(block).toMatch(/color:\s*var\(--theme-text-muted\)/)
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/)
    // 徽标在 32px 槽里居中，两位/三位数字都对称生长，行与行之间不左右跳
    expect(block).toMatch(/justify-self:\s*center/)
  })

  it('表头「序号」回落到普通列头文字, 不跟着变成色块', () => {
    const block = blockOf('.module-row-identity--head .module-row-identity-seq')
    expect(block).toMatch(/font-size:\s*var\(--app-font-size\)/)
    expect(block).toMatch(/font-weight:\s*600/)
    expect(block).toMatch(/background:\s*none/)
    expect(block).toMatch(/border-radius:\s*0/)
  })

  it('行内图标用弱化色, 悬停/展开才转主色', () => {
    const buttonBlock = blockOf(
      '.module-table-shell .module-row-identity .ant-btn',
    )
    expect(buttonBlock).toMatch(/color:\s*var\(--theme-text-muted\)/)
    // 24×24 命中区（CSS 像素），是 WCAG 2.5.8 的下限，不能再压小
    expect(buttonBlock).toMatch(/width:\s*24px/)
    expect(buttonBlock).toMatch(/height:\s*24px/)

    const hoverBlock = blockOf(
      '.module-table-shell .module-row-identity .ant-btn:not(:disabled):hover',
    )
    expect(hoverBlock).toMatch(/color:\s*var\(--theme-primary-text\)/)
  })

  it('热区在身份列内压回 24px, 且选择器特异性高于 touch-targets 的 44px 补丁', () => {
    const beforeBlock = blockOf(
      '.module-table-shell .module-row-identity .ant-btn::before',
    )
    expect(beforeBlock).toMatch(/width:\s*max\(100%,\s*24px\)/)
    expect(beforeBlock).toMatch(/height:\s*max\(100%,\s*24px\)/)
    // 补丁本身仍在（其它表格照旧享受 44px 热区），身份列只是用更高特异性覆盖它
    expect(touchTargetsCss).toContain(
      '.module-table-shell\n  .ant-btn-sm:not(.ant-btn-variant-solid.ant-btn-compact-item)::before',
    )
  })

  it('勾选列宽度走变量: 业务列表用身份列宽, 其它表格仍是 40px', () => {
    const block = blockOf('.module-table-shell .ant-table-selection-column')
    expect(block).toMatch(
      /width:\s*var\(--module-selection-column-width,\s*40px\) !important/,
    )
    expect(block).toMatch(
      /min-width:\s*var\(--module-selection-column-width,\s*40px\) !important/,
    )
  })
})

describe('勾选状态横幅样式契约', () => {
  it('整条浅蓝横幅: 撑满一行, 左右两端对齐, 上下各一道分隔线', () => {
    const block = blockOf('.module-selection-alert')
    expect(block).toMatch(/display:\s*flex/)
    expect(block).toMatch(/flex-wrap:\s*wrap/)
    expect(block).toMatch(/justify-content:\s*space-between/)
    expect(block).toMatch(/background:\s*var\(--theme-primary-soft\)/)
    expect(block).toMatch(
      /border-top:\s*1px solid var\(--theme-border-subtle\)/,
    )
    expect(block).toMatch(
      /border-bottom:\s*1px solid var\(--theme-border-subtle\)/,
    )
  })

  it('左侧合计允许换行, 单个指标不拆行(窄窗口下不叠字)', () => {
    const summary = blockOf('.module-selection-alert-summary')
    expect(summary).toMatch(/flex-wrap:\s*wrap/)
    expect(summary).toMatch(/min-width:\s*0/)
    expect(blockOf('.module-selection-alert-metric')).toMatch(
      /white-space:\s*nowrap/,
    )
  })

  it('动作区不参与压缩, 清除选择用主色文字按钮', () => {
    expect(blockOf('.module-selection-alert-actions')).toMatch(
      /flex:\s*0 0 auto/,
    )
    expect(blockOf('.module-selection-alert-clear.ant-btn')).toMatch(
      /color:\s*var\(--theme-primary-text\)/,
    )
  })
})
