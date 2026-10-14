/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 「按网价赋单价」弹层的高度稳定性契约(样式层)。
 *
 * <p>面板高度完全由内容决定, 而解析信息块每次改覆盖值都会在「解析中 / 解析结果 / 解析失败」
 * 之间切换。组件侧三态渲染同构骨架(同样的四行描述 + 同一行说明位), 样式侧则必须保证
 * **说明位的盒子是固定的一行高度**: 说明或错误文案再长也只占这一行, 失败态才会不比结果态
 * 高/矮(错误就地替换说明位的前提)。</p>
 */

const css = readFileSync(
  new URL('../../../styles/pricing-quote-modal.css', import.meta.url),
  'utf8',
)
/** 扁平化后的样式文本: 多行选择器(含换行)也能按字面量定位。 */
const flat = css.replace(/\s+/g, ' ')

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (selector: string) => {
  const index = flat.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = flat.indexOf('{', index)
  return flat.slice(start, flat.indexOf('}', start))
}

describe('按网价赋单价弹层的高度稳定性', () => {
  it('说明位是固定一行高度的槽位(说明 / 错误再长也不撑高面板)', () => {
    const block = blockOf(
      '.pricing-quote-summary .pricing-quote-summary-explanation {',
    )
    // 固定 height 而不是 min-height: 三态同高靠"盒子高度写死", 不指望文案恰好一样长
    expect(block).toMatch(/(^|[\s{;])height:\s*1\.5em/)
    expect(block).not.toMatch(/min-height/)
    // 预留空间必须随字号等比缩放, 不能用 px 写死(个人设置会放大字号)
    expect(block).not.toMatch(/height:\s*\d+px/)
    // 说明位与折叠开关同一行 ⇒ 开关不会把槽位挤成两行
    expect(block).toMatch(/display:\s*flex/)
  })

  it('说明 / 错误文案默认压成一行(超出省略号), 只有展开态才换行', () => {
    const textBlock = blockOf(
      '.pricing-quote-summary .pricing-quote-summary-explanation-text {',
    )
    expect(textBlock).toMatch(/overflow:\s*hidden/)
    expect(textBlock).toMatch(/text-overflow:\s*ellipsis/)
    expect(textBlock).toMatch(/white-space:\s*nowrap/)

    const expandedBlock = blockOf(
      '.pricing-quote-summary .pricing-quote-summary-explanation--expanded {',
    )
    expect(expandedBlock).toMatch(/height:\s*auto/)

    const expandedTextBlock = blockOf(
      '.pricing-quote-summary .pricing-quote-summary-explanation--expanded .pricing-quote-summary-explanation-text {',
    )
    expect(expandedTextBlock).toMatch(/white-space:\s*normal/)
    expect(expandedTextBlock).toMatch(/overflow:\s*visible/)
  })

  it('折叠开关视觉高度不超过槽位行高(命中区仍由 touch-targets.css 保证)', () => {
    const block = blockOf(
      '.pricing-quote-summary .pricing-quote-summary-explanation-toggle {',
    )
    expect(block).toMatch(/height:\s*auto/)
    expect(block).toMatch(/padding:\s*0/)
    // 字号随槽位等比缩放(em), 不用 px 写死
    expect(block).not.toMatch(/font-size:\s*\d+px/)
  })

  it('信息区容器不用固定 height / display:none 隐藏状态', () => {
    const block = blockOf('.pricing-quote-summary {')
    expect(block).not.toContain('display: none')
    // 固定 height 会裁切回退提示; 这里只允许 display: block 这类稳定盒子声明
    expect(block).not.toMatch(/(^|[^-])height:\s*\d/)
  })
})
