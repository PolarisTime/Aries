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

  it('行号用主题 token 并提供回退值，不写死单一色值', () => {
    const block = blockOf('.supplier-price-row-index')
    expect(block).toMatch(/var\(--ant-color-text-tertiary,\s*/)
  })
})
