/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./module-table.css', import.meta.url), 'utf8')

const blockOf = (selector: string) => {
  const marker = `\n${selector} {`
  const index = css.indexOf(marker)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start + 1, css.indexOf('\n}', start))
}

/**
 * 业务列表网格线的样式契约。
 *
 * <p>背景：基础规则对所有 module 表统一取消了 `border-inline-end`（只留行分隔线），
 * 于是 `bordered` 单开也没用。这里锁定两件事：</p>
 * <ol>
 *   <li>网格线只在 `.ant-table-bordered` 作用域里恢复 —— 其它表（主数据 / 财务 / 明细）
 *     外观不变，不会因为业务列表要网格线而一起变密；</li>
 *   <li>线色用 `--ant-color-border`（#d9d9d9），不是极浅的 `--theme-border-subtle`
 *     （#f0f0f0）—— 后者正是"网格线不明显"的原因。</li>
 * </ol>
 */
describe('业务列表网格线契约', () => {
  it('bordered 作用域内恢复列分隔线, 且线色足够可见', () => {
    const block = blockOf(
      '.module-table-shell .ant-table-bordered .ant-table-thead > tr > th,\n.module-table-shell .ant-table-bordered .ant-table-tbody > tr > td',
    )
    expect(block).toMatch(
      /border-inline-end:\s*1px solid var\(--ant-color-border,\s*#d9d9d9\) !important/,
    )
    expect(block).toMatch(
      /border-bottom:\s*1px solid var\(--ant-color-border,\s*#d9d9d9\) !important/,
    )
  })

  it('基础规则仍然取消列分隔线(未开 bordered 的表外观不变)', () => {
    const block = blockOf(
      '.module-table-shell .ant-table-tbody > tr > td,\n.module-table-shell .ant-table-tbody > tr > th,\n.module-table-shell .ant-table-tbody .ant-table-cell',
    )
    expect(block).toMatch(/border-inline-end:\s*0 !important/)
  })
})
