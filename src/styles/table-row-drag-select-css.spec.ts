/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./layout-shell.css', import.meta.url), 'utf8')

const blockOf = (selector: string) => {
  const marker = `\n${selector} {`
  const index = css.indexOf(marker)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start + 1, css.indexOf('\n}', start))
}

/**
 * 拖拽框选的样式契约。
 *
 * <p>行为本身由 `use-table-row-range-select.ts` 负责，这里只锁两件 jsdom 断不到的事：</p>
 * <ol>
 *   <li>表体禁用 `user-select` —— 否则拖拽会先拉出一片文字选区（用户反馈的原始问题）；</li>
 *   <li>框选进行中表体光标保持默认 —— 文本光标会让"正在拖选行"看起来像"正在选字"。</li>
 * </ol>
 */
describe('表格拖拽框选样式契约', () => {
  it('表体禁用划词选择（拖拽 = 选行，不是选文字）', () => {
    const block = blockOf('.module-table-shell .ant-table-tbody')
    expect(block).toMatch(/user-select:\s*none/)
    // Safari 仍需要前缀版本
    expect(block).toMatch(/-webkit-user-select:\s*none/)
  })

  it('框选进行中外壳带 is-row-drag-selecting 且光标为默认', () => {
    const block = blockOf(
      '.module-table-shell.is-row-drag-selecting,\n.module-table-shell.is-row-drag-selecting .ant-table-tbody',
    )
    expect(block).toMatch(/cursor:\s*default/)
  })
})
