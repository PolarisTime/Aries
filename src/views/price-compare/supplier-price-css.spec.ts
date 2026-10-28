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

describe('供应商报价表：Excel 式数字排版', () => {
  it('单元格更紧凑（表格软件的密度）', () => {
    const block = blockOf('.supplier-price-sheet .ant-table-tbody > tr > td')
    expect(block).toContain('padding:')
  })

  it('单价右对齐，便于按列比较', () => {
    const block = blockOf('.supplier-price-sheet .ant-input-number-input')
    expect(block).toContain('text-align: right')
  })

  it('单价使用等宽数字（tabular-nums），列内位数对齐', () => {
    const block = blockOf('.supplier-price-sheet .ant-input-number-input')
    expect(block).toContain('font-variant-numeric: tabular-nums')
  })

  it('列头品牌名可拖动（cursor: grab），并给出抓取反馈', () => {
    expect(blockOf('.supplier-price-brand-handle')).toContain('cursor: grab')
    expect(blockOf('.supplier-price-brand-handle:active')).toContain(
      'cursor: grabbing',
    )
  })

  it('列显示面板有最小宽度，勾选项不会被挤成两行', () => {
    expect(blockOf('.supplier-price-column-panel')).toContain('min-width')
  })

  it('格内多定尺：定尺标签窄且右对齐，价格输入占剩余宽度', () => {
    // 注意 `.supplier-price-lengths` 是它的前缀，必须精确匹配带空格的规则名
    const start = css.indexOf('.supplier-price-length {')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start))
    expect(block).toContain('width:')
    expect(block).toContain('text-align: right')
  })

  it('取消 rc-table 的 min-width:100%（否则固定列宽会被容器拉伸）', () => {
    const block = blockOf('.supplier-price-sheet table')
    expect(block).toContain('min-width: 0 !important')
  })

  it('行号用主题 token 并提供回退值，不写死单一色值', () => {
    const block = blockOf('.supplier-price-row-index')
    expect(block).toMatch(/var\(--ant-color-text-tertiary,\s*/)
  })
})
