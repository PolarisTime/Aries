/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('./supplier-price.css', import.meta.url),
  'utf8',
)

const blockOf = (selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

describe('供应商报价表：品牌选中行的可辨识性', () => {
  it('选中行有背景色区分', () => {
    const block = blockOf('.supplier-price-brand-row--active > td')
    expect(block).toContain('background:')
  })

  it('选中态不只靠颜色：另有左侧色条（WCAG 1.4.1）', () => {
    const block = blockOf('.supplier-price-brand-row--active > td:first-child')
    expect(block).toContain('box-shadow:')
    expect(block).toContain('inset')
  })

  it('使用主题 token 并提供回退值，不写死单一色值', () => {
    const block = blockOf('.supplier-price-brand-row--active > td')
    expect(block).toContain('var(--ant-color-primary-bg')
    expect(block).toMatch(/var\(--ant-color-primary-bg,\s*#/)
  })
})
