/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./module-table.css', import.meta.url), 'utf8')

const blockOf = (selector: string) => {
  const flat = css.replace(/\n\s*/g, ' ')
  const index = flat.indexOf(`${selector} {`)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = flat.indexOf('{', index)
  return flat.slice(start + 1, flat.indexOf('}', start))
}

/**
 * 详情弹窗字段网格（antd `Descriptions` bordered）的样式契约。
 *
 * <p>这三条都是"少一条就肉眼可见变丑"、但 jsdom 又量不出来的：</p>
 * <ol>
 *   <li>标签列定宽 + 不折行：否则「采购订单号」「已交付数量」在 4 列布局下折成两行；</li>
 *   <li>`table-layout: fixed` + `width: 100%`：antd 给 bordered 显式写了
 *     `table-layout: auto`（3 个类 + 1 个元素的特异性），auto 会按内容分列 ——
 *     长项目名那一格吃掉 525px，把「订单编号」挤到 155px，18 位单号从中间折行。
 *     只写 `table-layout: fixed` 不够（table 的 width 仍是 auto，fixed 仍按内容撑宽）；</li>
 *   <li>内容格允许换行：默认继承表格的 nowrap 会让长项目名整行溢出。</li>
 * </ol>
 */
describe('详情字段网格样式契约', () => {
  it('标签列定宽 116 且不折行', () => {
    const block = blockOf(
      '.module-record-detail-descriptions .ant-descriptions-item-label',
    )
    expect(block).toMatch(/width:\s*116px/)
    expect(block).toMatch(/white-space:\s*nowrap/)
  })

  it('表格 fixed 布局 + 100% 宽（否则按内容分列、长文本挤坏其它列）', () => {
    const block = blockOf(
      '.module-record-detail-descriptions.ant-descriptions-bordered > .ant-descriptions-view > table',
    )
    expect(block).toMatch(/table-layout:\s*fixed !important/)
    // table width 必须显式 100%：auto 时 fixed 布局仍按内容撑宽
    expect(block).toMatch(/width:\s*100% !important/)
  })

  it('内容格允许换行（长项目名/长备注不被 nowrap 顶出去）', () => {
    const block = blockOf(
      '.module-record-detail-descriptions .ant-descriptions-item-content',
    )
    expect(block).toMatch(/white-space:\s*normal/)
  })
})
