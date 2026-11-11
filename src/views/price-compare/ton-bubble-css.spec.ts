/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TON_BUBBLE_CLASS } from './TonCell'

const readCss = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), 'utf8')

const pageCss = readCss('./price-compare.css')
const variablesCss = readCss('../../styles/variables.css')

/** 取某条规则的声明块(按选择器字面量定位)。 */
const blockOf = (selector: string) => {
  const index = pageCss.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = pageCss.indexOf('{', index)
  return pageCss.slice(start, pageCss.indexOf('}', start))
}

/**
 * 吨位列气泡(锁定原因 Tooltip)的可读性契约(CSS 层, jsdom 不计算样式, 按声明文本做回归保护)。
 *
 * <p>两类静默失效只有 CSS 层能查:</p>
 * <ol>
 *   <li>背景回退成 antd 默认的 `colorBgSpotlight`(`rgba(0, 0, 0, 0.85)`), 页面文字从 15%
 *       透明里透进气泡与内容叠成重影;</li>
 *   <li>底色改走 `--ant-*`, 但本项目 antd cssVar 只在 `.leo-antd-app` 子树内注册, 弹层
 *       portal 到 body 后取不到变量, `var(--ant-*, 兜底值)` 恒等于兜底值 —— 深色模式会得到
 *       纯白底、浅色底上写着浅色字。</li>
 * </ol>
 *
 * <p>采购订单明细的 ⓘ popover 已随采购解耦移除, 这里只剩锁定原因 Tooltip 一套气泡。</p>
 */
describe('吨位列气泡样式契约', () => {
  it('气泡容器底色用项目自己的不透明浮层 token, 不用 85% 的 colorBgSpotlight', () => {
    const block = blockOf(`.${TON_BUBBLE_CLASS} .ant-tooltip-container`)
    // 完全不透明 + 跟随主题: 底色取项目浮层 token
    expect(block).toContain('var(--theme-overlay-surface')
    // 文字色必须显式覆盖: antd 深色气泡的文字是浅色, 只改底色会变成白底白字
    expect(block).toContain('var(--theme-overlay-text')
    // 边界清晰: 阴影 + 圆角
    expect(block).toContain('box-shadow: 0 6px 16px')
    expect(block).toContain('var(--app-border-radius')
    // 不得回退成半透明(antd Tooltip 的 colorBgSpotlight)
    expect(block).not.toMatch(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.85\s*\)/)
    expect(block).not.toContain('colorBgSpotlight')
    // antd token 在本项目的弹层里解析不到, 底/字色都不能依赖它
    expect(block).not.toContain('var(--ant-color-bg-elevated')
    expect(block).not.toContain('var(--ant-color-text')
  })

  it('箭头与气泡同底色, 不留半透明缺口', () => {
    const block = blockOf(`.${TON_BUBBLE_CLASS} .ant-tooltip-arrow`)
    expect(block).toContain('--ant-tooltip-arrow-background-color')
    expect(block).toContain('var(--theme-overlay-surface')
  })

  it('浮层 token 在深浅两套主题里都有不透明取值', () => {
    expect(variablesCss).toContain('--theme-overlay-surface: #ffffff;')
    expect(variablesCss).toContain('--theme-overlay-surface: #1a1f25;')
    expect(variablesCss).toContain('--theme-overlay-text: rgba(0, 0, 0, 0.88);')
    expect(variablesCss).toContain('--theme-overlay-text: #e2e8f0;')
    // 深色取值必须在 [data-theme="dark"] 块内生效(弹层 portal 到 body, 仍继承 html 的变量)
    const darkBlock = variablesCss.indexOf('[data-theme="dark"]')
    expect(darkBlock).toBeGreaterThan(-1)
    expect(
      variablesCss.indexOf('--theme-overlay-surface: #1a1f25;'),
    ).toBeGreaterThan(darkBlock)
  })
})
