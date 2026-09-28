/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 比价页缩放契约(R5): 取消整体等比放大。
 *
 * `zoom: 1.1` 会让 14px 字号渲染成 15.4px、32px 行高渲染成 35.2px,
 * 与全局控件密度不一致; 默认值必须是 1, 且仅保留变量作为逃生舱。
 */
const pageCss = readFileSync(
  new URL('./price-compare.css', import.meta.url),
  'utf8',
)

const blockOf = (css: string, selector: string) => {
  const index = css.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start, css.indexOf('}', start))
}

describe('比价页缩放', () => {
  it('根容器默认缩放为 1(不再整体放大)', () => {
    const block = blockOf(pageCss, '#price-compare-root')
    expect(block).toMatch(/zoom:\s*var\(--price-compare-zoom,\s*1\)/)
    expect(block).not.toMatch(/zoom:\s*var\(--price-compare-zoom,\s*1\.1\)/)
  })

  it('无任何写死的非 1 倍缩放默认值', () => {
    expect(pageCss).not.toMatch(/zoom:\s*1\.1/)
  })
})
