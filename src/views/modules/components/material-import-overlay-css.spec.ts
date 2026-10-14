/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 商品资料导入弹层（导入预览 / 导入结果）的尺寸与滚动契约（样式层）。
 *
 * <p>修复前是 antd Modal（`width=920`）：面板挂在 body 上，高度只能跟内容长（实测 35 行预览
 * 高 3845px），而覆盖层容器只有 1233×655 —— 标题与底部按钮全被顶到容器外。因此这里把
 * 「尺寸按覆盖层容器算、长内容在面板内部滚、长文本在单元格内换行」三条硬约束固化成用例：
 * 删掉其中任何一条，超框就会回来。</p>
 */

const readCss = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

/** 注释里可以讨论 `100vh`，规则里不行 —— 断言前先去注释。 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const overlayCss = stripComments(
  readCss('../../../styles/workspace-overlay.css'),
)
const importCss = stripComments(
  readCss('../../../styles/material-import-overlay.css'),
)

/** 取「行首选择器」开头的规则块，避免匹配到同名的复合选择器（如 --finance-editor 那条）。 */
const blockOf = (css: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{`).exec(css)
  expect(match, `未找到选择器 ${selector}`).toBeTruthy()
  const start = css.indexOf('{', match?.index ?? 0)
  return css.slice(start, css.indexOf('}', start))
}

describe('商品资料导入弹层的尺寸契约', () => {
  it('面板宽度按覆盖层容器收敛（min(1040px, 100% - 24px)），不使用视口单位', () => {
    const block = blockOf(overlayCss, '.workspace-overlay-panel--form-dialog')
    expect(block).toMatch(/width:\s*min\(1040px,\s*calc\(100%\s*-\s*24px\)\)/)
    expect(block).not.toMatch(/\d+vh\b/)
    expect(block).not.toMatch(/\d+vw\b/)
  })

  it('面板高度由容器封顶（max-height: min(900px, 100% - 24px)），禁止 100vh', () => {
    const block = blockOf(overlayCss, '.workspace-overlay-panel--form-dialog')
    expect(block).toMatch(
      /max-height:\s*min\(900px,\s*calc\(100%\s*-\s*24px\)\)/,
    )
    expect(block).not.toContain('100vh')
  })

  it('面板自身不滚，纵向滚动交给面板内部的 body（min-height: 0 + overflow-y: auto）', () => {
    const panel = blockOf(overlayCss, '.workspace-overlay-panel')
    expect(panel).toMatch(/overflow:\s*hidden/)
    expect(panel).toMatch(/display:\s*flex/)

    const body = blockOf(overlayCss, '.workspace-overlay-body')
    expect(body).toMatch(/flex:\s*1 1 auto/)
    expect(body).toMatch(/min-height:\s*0/)
    expect(body).toMatch(/overflow-y:\s*auto/)
  })

  it('「字段差异」长文本在单元格内换行，且横向滚动留在表格自身容器', () => {
    expect(importCss).toMatch(
      /\.material-import-rows-table \.ant-table-cell\s*\{[^}]*overflow-wrap:\s*anywhere/,
    )
    expect(importCss).toMatch(
      /\.material-import-rows-table \.ant-table-content\s*\{[^}]*overflow-x:\s*auto/,
    )
    // 不允许用「全局裁掉溢出」掩盖问题，也不允许引入视口单位
    expect(importCss).not.toMatch(/overflow-x:\s*hidden/)
    expect(importCss).not.toContain('100vh')
    expect(importCss).not.toContain('100vw')
  })
})
