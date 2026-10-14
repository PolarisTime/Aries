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
 * 原先 `.module-filter-toolbar` 的 `padding-bottom`（:2175）与
 * `.module-filter-chip-row` 的 `margin-bottom`（:2200）注释写的是同一个意图，
 * 各写了一次 16px，导致「筛选栏 → 表格」被算了两遍（实测 37px）。</p>
 *
 * <p>契约：边界留白只由**容器**给出；末行筛选控件不得自带下边距，
 * 否则再加一行筛选就会又多一份。留白值必须走 `--space-*` 阶梯变量，不写魔法数。</p>
 */

/** 取某条规则（选择器末尾直接跟 `{` 的情况）的声明块。 */
const blocksOf = (selector: string) =>
  [...shellCss.matchAll(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g'))].map(
    (match) => match[1],
  )

describe('列表页筛选区纵向留白契约', () => {
  it('边界留白只由容器给出：.module-filter-toolbar 声明 padding-bottom 阶梯值', () => {
    const blocks = blocksOf('\\.module-filter-toolbar')
    expect(blocks.length).toBeGreaterThan(0)

    const withPaddingBottom = blocks.filter((block) =>
      /padding-bottom:\s*var\(--space-(xxs|xs|sm|md|xl|2xl|3xl)\)/.test(block),
    )
    expect(
      withPaddingBottom.length,
      '容器必须用 --space-* 阶梯变量给出筛选区与命令区之间的留白（禁止魔法数）',
    ).toBeGreaterThan(0)
  })

  it('末行筛选控件不得自带下边距，否则与容器重复计算', () => {
    // 共享选择器列表 `.module-filter-quick-row,\n.module-filter-chip-row { … }` 也会被匹配到，
    // 因此这条断言能同时拦住"加回共享块"和"给 chip row 单独再加一条"两种回退。
    const chipRowBlocks = blocksOf('\\.module-filter-chip-row')
    expect(chipRowBlocks.length).toBeGreaterThan(0)

    for (const block of chipRowBlocks) {
      expect(
        block,
        '筛选区与命令区之间的留白由容器 padding-bottom 唯一给出，末行不得再带 margin-bottom',
      ).not.toMatch(/margin-bottom/)
    }
  })

  it('行间留白保留在行上：快捷筛选行仍声明 margin-bottom', () => {
    const quickRowBlocks = blocksOf('\\.module-filter-quick-row')
    expect(quickRowBlocks.length).toBeGreaterThan(0)
    expect(
      quickRowBlocks.some((block) =>
        /margin-bottom:\s*var\(--space-/.test(block),
      ),
      '「快捷筛选行 → 下一行」属于行间留白，必须保留在行上',
    ).toBe(true)
  })

  it('筛选条件之间的横向间距仍是阶梯值', () => {
    const chipRowBlocks = blocksOf('\\.module-filter-chip-row')
    expect(
      chipRowBlocks.some((block) => /gap:\s*var\(--space-/.test(block)),
      '筛选条件之间的 gap 必须走 --space-* 阶梯变量',
    ).toBe(true)
  })
})
