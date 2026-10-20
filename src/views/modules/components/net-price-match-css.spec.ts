/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 「网价匹配」工具栏的样式契约（无障碍相关部分）。
 *
 * <p>锁定一件不能靠肉眼回归的事：不可用状态用 `aria-disabled` 表达（按钮仍可聚焦，
 * 键盘用户才拿得到禁用原因），样式只负责"看起来不可用"。</p>
 *
 * <p>原「问题行清单」弹层已移除（它列的是全表清单，与表格「网价匹配」列重复），
 * 对应的命中区/滚动样式契约随之删除；差额改为由该列的标识以 sr-only 文本提供，
 * 见 `NetPriceMatchChip.spec.tsx`。</p>
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
})
