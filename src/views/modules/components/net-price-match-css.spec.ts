/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 「网价匹配」工具栏与问题行清单的样式契约(无障碍相关部分)。
 *
 * <p>这里锁定两件不能靠肉眼回归的事: ① 不可用状态用 `aria-disabled` 表达(按钮仍可聚焦,
 * 键盘用户才拿得到禁用原因), 样式只负责"看起来不可用"; ② 定位按钮保持 ≥24×24 命中区
 * (WCAG 2.5.8)。</p>
 */

const css = readFileSync(
  new URL('../../../styles/net-price-match.css', import.meta.url),
  'utf8',
)

const blockOf = (selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

describe('网价匹配工具栏样式契约', () => {
  it('置灰状态只由 aria-disabled 驱动, 不用原生 disabled 隐藏原因', () => {
    const block = blockOf(
      '.net-price-match-apply-disabled[aria-disabled="true"]',
    )
    expect(block).toMatch(/cursor:\s*not-allowed/)
    // 视觉置灰必须具备禁用态配色, 否则用户看不出按钮不可用
    expect(block).toMatch(/color:/)
  })

  it('问题行定位按钮命中区不小于 24×24(WCAG 2.5.8)', () => {
    const block = blockOf('.net-price-problems .ant-btn')
    const minHeight = Number(/min-height:\s*(\d+)px/.exec(block)?.[1] ?? 0)
    expect(minHeight).toBeGreaterThanOrEqual(24)
  })

  it('问题行清单可滚动而不撑破弹层', () => {
    const block = blockOf('.net-price-problems {')
    expect(block).toMatch(/max-height:/)
    expect(block).toMatch(/overflow-y:\s*auto/)
  })
})
