/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 报单比价 / 供应商报价表的**字号跟随**契约。
 *
 * <p>背景：个人设置「字体大小」（11/12/13/14/16/18px）会改写 `--app-font-size` 与 antd 主题
 * token，但这两个页面的样式里曾经写死 33 处 `font-size: 12px` 一类绝对值 —— 结果是
 * "正文和表头变大了，价格数字还卡在 12px"，同一行里两种字号并存。</p>
 *
 * <p>因此这里把"不许再出现绝对字号"变成可执行断言：新增/回退代码里只要有人再写
 * `font-size: 13px`，这条用例就会红。</p>
 */
const cssFiles = [
  './price-compare.css',
  './supplier-price.css',
  './price-compare-context-bar.css',
] as const

const readCss = (file: string) =>
  readFileSync(new URL(file, import.meta.url), 'utf8')

describe('比价页面：字号必须随个人设置缩放', () => {
  it.each(cssFiles)('%s 不出现绝对字号（font-size: <n>px）', (file) => {
    const source = readCss(file)
    const absolute = source.match(/font-size:\s*\d+(\.\d+)?px/g) ?? []
    expect(
      absolute,
      `${file} 里仍有绝对字号，应改用 --app-font-size* 变量`,
    ).toEqual([])
  })

  it.each(cssFiles)('%s 的字号只引用 --app-font-size 系列变量', (file) => {
    const source = readCss(file)
    const declarations = source.match(/font-size:\s*[^;]+;/g) ?? []
    for (const declaration of declarations) {
      // `inherit` 天然跟随父级（父级字号就是个人设置字号），不需要换成变量
      if (/font-size:\s*inherit;/.test(declaration)) continue
      expect(declaration).toMatch(/--app-font-size/)
    }
  })

  it('字号阶梯变量定义在 variables.css，且基于 --app-font-size 计算', () => {
    const variables = readFileSync(
      new URL('../../styles/variables.css', import.meta.url),
      'utf8',
    )
    for (const token of [
      '--app-font-size-3xs',
      '--app-font-size-2xs',
      '--app-font-size-xs',
      '--app-font-size-sm',
      '--app-font-size-lg',
    ]) {
      expect(variables, `缺少字号变量 ${token}`).toContain(`${token}:`)
    }
    // 次级字号必须是 calc(--app-font-size × 比例) 或 + 偏移，不能是死值
    expect(variables).toMatch(
      /--app-font-size-xs:\s*calc\(var\(--app-font-size\)/,
    )
    expect(variables).toMatch(
      /--app-font-size-lg:\s*calc\(var\(--app-font-size\)/,
    )
  })

  it('表格输入框高度随字号缩放（不再写死 24px，大字号下不裁字）', () => {
    const source = readCss('./price-compare.css')
    const block = source.slice(
      source.indexOf('.price-compare-table .ant-table-small .ant-input {'),
    )
    expect(block.slice(0, 200)).toContain(
      'height: calc(var(--app-font-size) + 10px)',
    )
  })
})
