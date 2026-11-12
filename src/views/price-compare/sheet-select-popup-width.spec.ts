/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 列定义已抽到 sheet-columns.tsx: 两处源码一起扫描, 保证「凡窄选择器都按内容撑开」这条契约
// 在拆分后仍然覆盖全部下拉(原先只扫 SheetPanel.tsx)。
const source = [
  readFileSync(new URL('./SheetPanel.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./sheet-columns.tsx', import.meta.url), 'utf8'),
].join('\n')

/**
 * 单据表格内「窄选择器」的下拉宽度契约(源码层回归保护)。
 *
 * <p>antd `Select` 的 `popupMatchSelectWidth` 默认为 `true`(下拉与选择器同宽)。单据表格的
 * 列宽为了塞下一屏被压到 60~200px, 下拉跟着同宽后选项文本只剩约 117px, 实测:</p>
 * <ul>
 *   <li>商品下拉: 「HRB400E 12 12米」自然宽 121px, 88 个选项里有 20 个被省略成
 *       「HRB400 10 ...」;</li>
 * </ul>
 *
 * <p>jsdom 不计算布局, 测不出「有没有被省略」, 因此这里按源码声明做回归保护: 单据表格里凡是
 * 声明了固定/计算宽度的 `Select` 都必须显式设置 `popupMatchSelectWidth={false}`, 让下拉按内容
 * 撑开。真机宽度已在 16px 字号下实测(商品下拉 164px, 截断数为 0)。</p>
 */
describe('单据表格窄选择器的下拉宽度契约', () => {
  /** 以 `<Select` 为界切段: 每段即一个下拉的 JSX 配置。 */
  const selectBlocks = source
    .split(/<Select\b/)
    .slice(1)
    .map((block, index) => ({ index, code: block.split(/<Select\b/)[0] }))

  const blocksWithInlineWidth = selectBlocks.filter((block) =>
    /style=\{\{\s*width/.test(block.code),
  )

  it('确实存在带固定宽度的下拉(守卫本身不失灵)', () => {
    // 「默认禁止手动改价」后，供应商相关下拉（单元格简称 / 批量填入）已移除；
    // 目前只剩「参照时段」与「商品」两个固定宽度的下拉。
    expect(blocksWithInlineWidth.length).toBeGreaterThanOrEqual(2)
  })

  it('每个声明了宽度的下拉都按内容撑开, 避免选项文本被省略号截断', () => {
    const offenders = blocksWithInlineWidth
      .filter((block) => !block.code.includes('popupMatchSelectWidth={false}'))
      .map((block) => block.code.split('\n').slice(0, 4).join(' ').trim())

    expect(
      offenders,
      `以下下拉缺少 popupMatchSelectWidth={false}, 选项会被截断:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('商品下拉保留选中项的完整商品名(Tooltip 兜底)', () => {
    // 选中项受「规格」列宽约束, 仍可能被裁; 必须留原生 title 让人悬停可读。
    expect(source).toContain('labelRender={({ label }) => (')
    expect(source).toContain(
      "title={typeof label === 'string' ? label : undefined}",
    )
  })
})
