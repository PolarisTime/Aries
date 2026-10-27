/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 首位身份列（序号⇄勾选 + 动作组）的样式契约。
 *
 * <p>锁定四件靠肉眼容易回归、jsdom 又量不出来的事：</p>
 * <ol>
 *   <li>两列网格（26px 选择器 + 自动宽动作组）：表头与行内共用同一基准，全选复选框
 *       才会正对行勾选框；</li>
 *   <li>「序号⇄勾选」的显隐切换：勾选框常态透明叠在徽标上，行悬停 / 键盘聚焦 /
 *       已勾选时才显出来，徽标同时淡出 —— 少了任一条，两个控件就叠在一起；</li>
 *   <li>动作组两个按钮之间只有 1px 细线（inset shadow，不占宽度）；</li>
 *   <li>命中区仍是 24×24（WCAG 2.2 SC 2.5.8），且不能被 `touch-targets.css` 的
 *       44px 热区补丁覆盖。</li>
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
  it('两列固定网格: 26px 选择器槽位 + 自动宽动作组', () => {
    const block = blockOf('.module-row-identity')
    expect(block).toMatch(/display:\s*grid/)
    expect(block).toMatch(/grid-template-columns:\s*26px auto/)
    expect(block).toMatch(/column-gap:\s*var\(--space-xxs\)/)
    // 列宽被浏览器摊宽时（列少、不需要横向滚动的页面）两者一起居中，不会错位
    expect(block).toMatch(/justify-content:\s*center/)
  })

  it('序号⇄勾选: 勾选框叠在徽标上, 常态透明, 悬停/聚焦/已勾选才显出来', () => {
    const slot = blockOf('.module-row-identity-selector')
    expect(slot).toMatch(/position:\s*relative/)
    expect(slot).toMatch(/width:\s*26px/)

    // 只对数据行生效: 表头的全选复选框必须常显
    const overlay = blockOf(
      '.ant-table-row .module-row-identity-selector .ant-checkbox-wrapper',
    )
    expect(overlay).toMatch(/position:\s*absolute/)
    expect(overlay).toMatch(/inset:\s*0/)
    // 透明但仍在命中区里: 点徽标 = 勾选该行
    expect(overlay).toMatch(/opacity:\s*0/)

    // 折叠空白再比对: biome 会把长选择器列表折成多行, 直接匹配整行会误报
    const reveal = css.replace(/\s+/g, ' ')
    for (const trigger of [
      '.ant-table-row:hover .module-row-identity-selector .ant-checkbox-wrapper',
      '.module-row-identity-selector:focus-within .ant-checkbox-wrapper',
      '.module-row-identity--selected .module-row-identity-selector .ant-checkbox-wrapper',
    ]) {
      expect(reveal).toContain(trigger)
    }
    // 勾选框露出来时徽标要让位, 否则两个控件叠在一起
    expect(reveal).toContain(
      '.module-row-identity--selected .module-row-identity-seq',
    )
    expect(blockOf('.module-row-identity-seq')).toMatch(/transition:\s*opacity/)
  })

  it('动作组: 明细加号与行菜单相邻, 中间一道 12px 细线', () => {
    const actions = blockOf('.module-row-identity-actions')
    expect(actions).toMatch(/display:\s*inline-flex/)
    // 分隔线画在容器伪元素上: 按钮圆角会把 border / inset shadow 渲染成弯线
    expect(actions).toMatch(/position:\s*relative/)
    const divider = blockOf('.module-row-identity-actions::before')
    expect(divider).toMatch(/left:\s*24px/)
    expect(divider).toMatch(/width:\s*1px/)
    expect(divider).toMatch(/height:\s*12px/)
    expect(divider).toMatch(/background:\s*var\(--theme-border-subtle\)/)
  })

  it('序号徽标: 18px 高、22px 起宽、浅色圆角底 + 弱化 12px 数字', () => {
    const block = blockOf('.module-row-identity-seq')
    expect(block).toMatch(/min-width:\s*22px/)
    expect(block).toMatch(/height:\s*18px/)
    expect(block).toMatch(/background:\s*var\(--theme-surface-hover\)/)
    expect(block).toMatch(/border-radius:\s*6px/)
    expect(block).toMatch(/font-size:\s*12px/)
    expect(block).toMatch(/color:\s*var\(--theme-text-muted\)/)
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it('表头列名是普通列头文字, 不跟着变成徽标色块', () => {
    const block = blockOf('.module-row-identity-head-label')
    expect(block).toMatch(/font-size:\s*var\(--app-font-size\)/)
    expect(block).toMatch(/font-weight:\s*600/)
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
