/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('./touch-targets.css', import.meta.url),
  'utf8',
)
const globalCss = readFileSync(new URL('./global.css', import.meta.url), 'utf8')

/**
 * 触摸热区补丁与弹窗关闭按钮的契约。
 *
 * <p>背景：`button:not(...) { position: relative }` 这个全局补丁的 `:not()` 参数里带了
 * 类选择器，特异性 (0,2,1) 高于 antd 自己的 `.ant-modal .ant-modal-close` (0,2,0)，
 * 于是关闭 x 从右上角的绝对定位掉进标题行（实测 x=309、标题起点 x=321，视觉上贴着标题）。
 * 现在把 position 规则整体包进 `:where()`（特异性 0），antd 的绝对定位规则必胜。</p>
 */
describe('触摸热区补丁与弹窗关闭按钮', () => {
  it('position 规则用 :where() 包住，特异性为 0', () => {
    const index = css.indexOf('position: relative;')
    expect(index).toBeGreaterThan(-1)
    const start = css.lastIndexOf('}', index)
    const selector = css.slice(start + 1, index)
    expect(selector).toContain(':where(')
    // 不能出现又回到高特异性的写法：`button:not(` 直接以 position: relative 结尾
    expect(css).not.toMatch(/\nbutton:not\([^)]*\)\s*\{\s*position:\s*relative/)
  })

  it('关闭类按钮不参与 ::before 热区扩张（antd 自身已 ≥24×24）', () => {
    const beforeStart = css.indexOf('::before {')
    expect(beforeStart).toBeGreaterThan(-1)
    const beforeBlock = css.slice(0, beforeStart)
    expect(beforeBlock).toContain('[class*="-close"]')
    // 已有例外不能被顺手删掉（回归保护）
    expect(beforeBlock).toContain('.workspace-overlay-mask')
    expect(beforeBlock).toContain('.ant-select-clear')
    expect(beforeBlock).toContain('.ant-picker-clear')
  })

  it('弹窗 body 有视口高度上限并在内部滚动（关闭按钮不会被长内容挤出屏幕）', () => {
    const index = globalCss.indexOf(
      '.ant-modal-root .ant-modal .ant-modal-body {',
    )
    expect(index).toBeGreaterThan(-1)
    const block = globalCss.slice(index, globalCss.indexOf('}', index))
    expect(block).toMatch(/max-height:\s*calc\(100vh - 220px\)/)
    expect(block).toMatch(/overflow-y:\s*auto/)
  })
})
