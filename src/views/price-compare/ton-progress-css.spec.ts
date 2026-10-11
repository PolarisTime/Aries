/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TON_ISSUED_RATIO_WIDTH } from './core'

const pageCss = readFileSync(
  new URL('./price-compare.css', import.meta.url),
  'utf8',
)

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (selector: string) => {
  const index = pageCss.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = pageCss.indexOf('{', index)
  return pageCss.slice(start, pageCss.indexOf('}', start))
}

/** 取某条规则里的 flex 收缩因子(flex: <grow> <shrink> <basis>)。 */
const flexShrinkOf = (selector: string) => {
  const block = blockOf(selector)
  const match = block.match(/flex:\s*([\d.]+)\s+([\d.]+)/)
  expect(match, `${selector} 未声明 flex: <grow> <shrink>`).not.toBeNull()
  return Number(match?.[2] ?? '0')
}

/**
 * 吨位进度小字的层结构契约(CSS 层, jsdom 不计算布局, 按声明文本做回归保护)。
 *
 * <p>线上缺陷(2026-10-09 用户截图): 个人字号 12px + 面板窄于表格总宽时, 吨位格进度小字
 * 被截成「已开 0/1…」「已开 …」—— 比值读不出来。根因是比值与品牌同处一个省略号层,
 * 浏览器为「…」预留宽度后先吃掉了比值; 且小字号档列宽被等比压小, 固定尺寸的明细图标
 * 与固定 11px 的小字没有一起缩小。修复分两处: 结构层把品牌拆出去并让它先让位,
 * 列宽层由 {@link requiredTonColumnWidth} 兜底(数值契约见 core.spec.ts)。</p>
 */
describe('吨位进度小字层结构契约', () => {
  it('品牌层有独立省略号层, 不与比值同层', () => {
    const brandGroup = blockOf('.price-compare-ton-brand-group {')
    expect(brandGroup).toContain('overflow: hidden')
    // 品牌层自己带省略号层, 被压缩时以省略号收尾(不留下半个字)
    const brand = blockOf('.price-compare-ton-brand {')
    expect(brand).toContain('overflow: hidden')
    expect(brand).toContain('text-overflow: ellipsis')
    expect(brand).toContain('min-width: 0')
  })

  it('品牌层先让位: 收缩因子远大于比值层', () => {
    const brandShrink = flexShrinkOf('.price-compare-ton-brand-group {')
    const issuedShrink = flexShrinkOf('.price-compare-ton-issued {')
    // 收缩额度按 flex-shrink × flex-basis 分配: 品牌必须独占缺口, 比值保持完整
    expect(brandShrink).toBeGreaterThan(issuedShrink)
    // 比值层保留省略号兜底(品牌已压到 0 之后才可能用到)
    const issued = blockOf('.price-compare-ton-issued {')
    expect(issued).toContain('overflow: hidden')
    expect(issued).toContain('text-overflow: ellipsis')
    expect(issued).toContain('min-width: 0')
  })

  it('品牌层与比值层同字号同色, 拆层不改视觉', () => {
    const brandGroup = blockOf('.price-compare-ton-brand-group {')
    // 小字固定 11px(不随个人字号缩放), 拆层后品牌不能退回继承字号
    expect(brandGroup).toContain('font-size: 11px')
    expect(brandGroup).toContain('var(--ant-color-text-secondary')
    // 超额时品牌同样转警告色(TonCell 会把 hint--over 加到品牌层上)
    expect(blockOf('.price-compare-ton-hint--over')).toContain(
      'var(--color-danger-active',
    )
  })

  it('比值宽度契约与样式层一致: 11px 小字「已开 0/26」上界 51px', () => {
    expect(TON_ISSUED_RATIO_WIDTH).toBe(51)
    expect(blockOf('.price-compare-ton-issued {')).toContain('font-size: 11px')
  })
})
