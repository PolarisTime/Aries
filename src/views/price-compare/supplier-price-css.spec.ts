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
    // 精确匹配规则名：`.supplier-price-column-panel-label` 是它的前缀
    const start = css.indexOf('.supplier-price-column-panel {')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start))
    expect(block).toContain('min-width')
  })

  it('行分组：组的第一行画更粗的分隔线（类别/材质合并格据此可辨）', () => {
    const block = blockOf(
      '.supplier-price-sheet .ant-table-tbody > tr > td.supplier-price-group-start',
    )
    expect(block).toMatch(/border-top:\s*2px/)
  })

  it('框线加深一档：改写 antd 的表格边框变量，而不是和它的规则抢优先级', () => {
    const block = blockOf('.supplier-price-sheet .ant-table-css-var')
    expect(block).toContain('--ant-table-border-color')
    expect(block).toContain('var(--ant-color-border')
  })

  it('规格没有该定尺时用占位符，不给可编辑空框', () => {
    expect(blockOf('.supplier-price-cell-na')).toContain('text-align: center')
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
