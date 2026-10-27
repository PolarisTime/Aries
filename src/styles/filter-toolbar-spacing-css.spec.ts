/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shellCss = readFileSync(
  new URL('./layout-shell.css', import.meta.url),
  'utf8',
)

/**
 * 列表页筛选区纵向留白的样式契约。
 *
 * <p>这些是纯 CSS、jsdom 里断不到渲染结果，但一旦被"顺手加回一份"就会静默失效：
 * 历史上 `.module-filter-toolbar` 的 `padding-bottom` 与筛选行的 `margin-bottom`
 * 注释写的是同一个意图，各写了一次 16px，导致「筛选栏 → 表格」被算了两遍（实测 37px）。</p>
 *
 * <p>筛选区改「表单式」后的契约：纵向留白**只由行容器的内边距**给出
 * （`.module-filter-form-row` 的 `padding`），行内元素不再自带 margin；
 * 行/列间距走 `gap`，值必须是 `--space-*` 阶梯变量，不写魔法数。</p>
 */

/** 取某条规则（选择器末尾直接跟 `{` 的情况）的声明块。 */
const blocksOf = (selector: string) =>
  [...shellCss.matchAll(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g'))].map(
    (match) => match[1],
  )

describe('列表页筛选区纵向留白契约', () => {
  it('纵向留白只由行容器给出：.module-filter-form-row 的 padding 走阶梯值', () => {
    const rowBlocks = blocksOf('\\.module-filter-form-row')
    expect(rowBlocks.length).toBeGreaterThan(0)
    expect(
      rowBlocks.some((block) =>
        /padding:\s*var\(--space-(xxs|xs|sm|md|xl|2xl|3xl)\)\s+var\(--space-/.test(
          block,
        ),
      ),
      '筛选区上下留白必须由行容器的 padding 给出（禁止魔法数）',
    ).toBe(true)
  })

  it('.module-filter-toolbar 不再叠加第二层纵向留白', () => {
    const blocks = blocksOf('\\.module-filter-toolbar')
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(
        block,
        '容器 padding-bottom 与行容器 padding 各写一份会把间距算两遍（历史踩过 37px）',
      ).not.toMatch(/padding-bottom:\s*var\(--space-/)
    }
  })

  it('行内元素不自带 margin：.module-filter-field 只靠父级 gap 排版', () => {
    const fieldBlocks = blocksOf('\\.module-filter-field')
    expect(fieldBlocks.length).toBeGreaterThan(0)
    for (const block of fieldBlocks) {
      expect(block).not.toMatch(/margin-(bottom|top):/)
    }
  })

  it('行/列间距走 gap 阶梯值（换行与相邻条件分别给值）', () => {
    const rowBlocks = blocksOf('\\.module-filter-form-row')
    expect(
      rowBlocks.some((block) =>
        /gap:\s*var\(--space-(xxs|xs|sm|md|xl|2xl|3xl)\)\s+var\(--space-/.test(
          block,
        ),
      ),
      '筛选条件之间的 gap 必须走 --space-* 阶梯变量',
    ).toBe(true)
  })
})
