/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shellCss = readFileSync(
  new URL('../../styles/layout-shell.css', import.meta.url),
  'utf8',
)

/**
 * 非激活面板的隐藏规则。
 *
 * <p>按正则定位(而不是选择器字面量): CSS 属性选择器的引号风格由 biome 统一为双引号,
 * 写成 `'true'` 的字面量匹配会在格式化后静默失配 —— 实测这条正则第一次就以
 * 「未找到选择器」变红, 因此这里对单/双引号都容忍。</p>
 */
const NON_ACTIVE_PANEL_RULE =
  /\.leo-tab-panel:not\(\[data-tab-active=["']true["']\]\)\s*\{([^}]*)\}/

/**
 * 多标签页面板的布局契约。
 *
 * <p>背景(2026-10-15 缺陷): 面板外壳是 `.leo-content-inner` 的直接 flex item
 * (`flex: 1 1 auto`), 而 React Activity 只把**子树**置为内联 `display:none` ——
 * 外壳本身仍是可见的可增长 flex item, 会按 flex-grow 分走内容区剩余高度, 把激活页面
 * 按标签序号整体下推: 实测 7 个标签 / 1280×720 时 6 个空壳各吃 23px, 激活面板 top
 * 从 129 被推到 269; 2339×1478 视口下表现为页面顶部数百像素空白, 内容「错位」到下半屏。</p>
 *
 * <p>该规则是纯 CSS, jsdom 里拿不到渲染结果, 一旦被回退不会有任何单测变红(布局回归是静默的),
 * 因此按声明文本做保护; 真实布局由 e2e 用例守护
 * (tests/e2e/navigation.spec.ts 的「多标签页布局契约」)。</p>
 */
describe('多标签页面板布局契约', () => {
  it('非激活面板的外壳必须整体 display:none, 不得作为 flex item 参与内容区分配', () => {
    const rule = shellCss.match(NON_ACTIVE_PANEL_RULE)
    expect(rule, '未找到「非激活面板退出布局」规则').not.toBeNull()
    expect(rule?.[1]).toMatch(/display:\s*none/)
  })
})
