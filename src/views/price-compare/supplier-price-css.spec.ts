/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('./supplier-price.css', import.meta.url),
  'utf8',
)

/** 同一选择器可能出现在多个规则块（分组选择器/补充规则），逐个返回块内容。 */
const blocksOf = (selector: string): string[] => {
  const blocks: string[] = []
  let index = css.indexOf(selector)
  while (index > -1) {
    const start = css.indexOf('{', index)
    const end = css.indexOf('}', start)
    blocks.push(css.slice(start, end))
    index = css.indexOf(selector, end)
  }
  return blocks
}

const blockOf = (selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

describe('供应商报价表：Excel 式数字排版', () => {
  it('单元格更紧凑（表格软件的密度）', () => {
    const block = blockOf(
      '.supplier-price-sheet .ant-table-wrapper .ant-table-tbody > tr > td',
    )
    expect(block).toContain('padding:')
  })

  it('行高按 --app-font-size 换算：字号变化时行高自动跟着变', () => {
    // 行高不能写死 px：个人设置把字号从 14px 调到 20px 时，行高必须同比长高
    const vars = css.slice(
      css.indexOf('--supplier-price-em:'),
      css.indexOf('}', css.indexOf('--supplier-price-em:')),
    )
    expect(vars).toContain('var(--app-font-size')
    expect(vars).toContain('--supplier-price-row-height: calc(')
  })

  it('输入框高度与行高共用同一个变量，不再写死 30px', () => {
    expect(css).not.toMatch(
      /\.ant-input-number-input[^{}]*\{[^}]*height:\s*30px/,
    )
    const blocks = blocksOf('.supplier-price-sheet .ant-input-number-input')
    expect(
      blocks.some((block) =>
        block.includes('height: var(--supplier-price-row-height'),
      ),
    ).toBe(true)
  })

  it('内边距覆盖 antd css-in-js 时用 !important（同级特异性会被它后注入覆盖）', () => {
    const block = blockOf(
      '.supplier-price-sheet .ant-table-wrapper .ant-table-tbody > tr > td',
    )
    expect(block).toContain('!important')
  })

  it('单价右对齐，便于按列比较', () => {
    const blocks = blocksOf('.supplier-price-sheet .ant-input-number-input')
    expect(blocks.some((block) => block.includes('text-align: right'))).toBe(
      true,
    )
  })

  it('单价使用等宽数字（tabular-nums），列内位数对齐', () => {
    const blocks = blocksOf('.supplier-price-sheet .ant-input-number-input')
    expect(blocks.some((block) => block.includes('tabular-nums'))).toBe(true)
  })

  it('列头品牌名可拖动（cursor: grab），并给出抓取反馈', () => {
    expect(blockOf('.supplier-price-brand-handle')).toContain('cursor: grab')
    expect(blockOf('.supplier-price-brand-handle:active')).toContain(
      'cursor: grabbing',
    )
  })

  it('列显示面板：固定宽度 + 胶囊勾选（不再是裸 checkbox 长列表）', () => {
    const start = css.indexOf('.supplier-price-column-panel {')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start))
    expect(block).toContain('width: 300px')
    // 列多时面板内部滚动，不跑出视口
    expect(block).toContain('max-height')
    expect(block).toContain('overflow-y: auto')

    // 勾选项做成胶囊（圆角 + 选中描边），并按分组换行
    const chipStart = css.indexOf(
      '.supplier-price-column-panel-chips .ant-checkbox-wrapper {',
    )
    expect(chipStart).toBeGreaterThan(-1)
    const chip = css.slice(chipStart, css.indexOf('}', chipStart))
    expect(chip).toContain('border-radius: 999px')
    // 换行/缩进会被格式化工具拆行，比较前先压平空白
    expect(css.replace(/\s+/g, ' ')).toContain(
      '.supplier-price-column-panel-chips .ant-checkbox-wrapper:has(.ant-checkbox-checked)',
    )
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
