/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 财务单据编辑弹层（`.workspace-overlay-panel--finance-editor`）的尺寸契约。
 *
 * <p>覆盖层容器（`.workspace-overlay`，position: absolute + inset: 0）位于顶栏与页签之下，
 * 因此面板尺寸必须按**覆盖层容器**算。用 `100vw` / `100vh` 会按整个视口计算，面板底边落到
 * 内容区之外、「取消 / 保存」被裁在屏幕外 —— 主数据弹层（`--form-dialog`）已踩过同一个坑，
 * 见 `src/views/modules/components/material-import-overlay-css.spec.ts`。</p>
 *
 * <p>这些断言锁的是"容器百分比"这一条契约，不是具体像素：把 min() 的像素上限调大调小都不会失败，
 * 但只要有人改回视口单位（或重新加回 `@media` 视口断点）就会失败。</p>
 */

const readCss = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

/** 注释里可以讨论 `100vh`，规则里不行。 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const overlayCss = stripComments(readCss('./workspace-overlay.css'))

/** 取「行首选择器」开头的规则块，避免匹配到同名的复合选择器。 */
const blockOf = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{`).exec(overlayCss)
  expect(match, `未找到选择器 ${selector}`).toBeTruthy()
  const start = overlayCss.indexOf('{', match?.index ?? 0)
  return overlayCss.slice(start, overlayCss.indexOf('}', start))
}

describe('财务单据编辑弹层的尺寸契约', () => {
  it('宽高按覆盖层容器收敛（min(Npx, 100% - 32px)），不使用视口单位', () => {
    const block = blockOf('.workspace-overlay-panel--finance-editor')
    expect(block).toMatch(/width:\s*min\(720px,\s*calc\(100%\s*-\s*32px\)\)/)
    expect(block).toMatch(/height:\s*min\(760px,\s*calc\(100%\s*-\s*32px\)\)/)
    expect(block).not.toMatch(/\d+vh\b/)
    expect(block).not.toMatch(/\d+vw\b/)
  })

  it('保持圆角与阴影（收到容器尺寸后不能被样式覆盖丢失）', () => {
    const block = blockOf('.workspace-overlay-panel--finance-editor')
    expect(block).toMatch(/border-radius:/)
    expect(block).toMatch(/box-shadow:/)
  })

  it('不再为财务编辑弹层单独写视口断点（窄屏由容器百分比封顶）', () => {
    const mediaBlocks = overlayCss.match(/@media[^{]+\{[\s\S]*?\n\}/g) ?? []
    expect(mediaBlocks.join('\n')).not.toContain('finance-editor')
  })
})
