/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 「按网价赋单价」弹层的高度稳定性契约(样式层)。
 *
 * <p>面板高度完全由内容决定, 而解析信息块每次改覆盖值都会在"解析中"与"解析结果"之间切换。
 * 组件侧渲染同构骨架(同样的四行描述 + 同一行说明位), 样式侧则必须保证**说明位为空时也占一行**
 * —— 否则"解析中有文案"与"结果没有 explanation"之间仍会差一行, 弹层照样跳。</p>
 */

const css = readFileSync(
  new URL('../../../styles/pricing-quote-modal.css', import.meta.url),
  'utf8',
)

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

describe('按网价赋单价弹层的高度稳定性', () => {
  it('说明位为空时也保留一行高度(解析中 ↔ 无说明的结果态不差一行)', () => {
    const block = blockOf('.pricing-quote-summary-explanation')
    expect(block).toMatch(/min-height:\s*[\d.]+em/)
    expect(block).toMatch(/display:\s*block/)
    // 预留空间必须随字号等比缩放, 不能用 px 写死(个人设置会放大字号)
    expect(block).not.toMatch(/min-height:\s*\d+px/)
  })

  it('信息区容器不用固定 height / display:none 隐藏状态', () => {
    const block = blockOf('.pricing-quote-summary {')
    expect(block).not.toContain('display: none')
    // 固定 height 会裁切回退提示; 这里只允许 display: block 这类稳定盒子声明
    expect(block).not.toMatch(/(^|[^-])height:\s*\d/)
  })
})
