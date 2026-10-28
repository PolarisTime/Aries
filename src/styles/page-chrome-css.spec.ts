/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./layout-shell.css', import.meta.url), 'utf8')

/** 取某条规则的声明块；选择器按出现顺序匹配（含折行写法）。 */
const blockOf = (selector: string) => {
  const flat = css.replace(/\n\s*/g, ' ')
  const marker = `${selector} {`
  const index = flat.indexOf(marker)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = flat.indexOf('{', index)
  return flat.slice(start + 1, flat.indexOf('}', start))
}

/**
 * 页头两层的排布契约（顶栏 / 标签栏 → 内容卡）。面包屑已整体移除。
 *
 * <p>使用者反馈「几个区域的边距不好看」。根因是左缘各走各的（顶栏 logo 12、标签块 8、
 * 卡片内文字 33），这里锁定统一后的口径：</p>
 * <ol>
 *   <li>左缘统一走 `--space-md`(16px)：顶栏内边距、标签栏 nav 内边距；</li>
 *   <li>标签栏铺浅灰底 + 一条下边框，作为唯一的页眉条；</li>
 *   <li>选中的标签是"抬起的文件夹页签"（白底 + 可见边框 + 主色顶条）。</li>
 * </ol>
 */
/**
 * 面包屑移除后的顶部对齐。
 *
 * <p>面包屑曾是标签条与页面卡片之间的一行"层级说明"，为此内容区顶部留了
 * 4px(内容区) + 8px(页面容器)。移除后标签条就是唯一页眉，这两层留白必须在 CSS 里
 * **同时**归零，否则标签条与卡片之间会留一条无内容的灰带，像页面没加载完。</p>
 */
describe('面包屑移除后的顶部对齐', () => {
  it('面包屑样式已从样式表移除', () => {
    expect(css.includes('.leo-breadcrumb')).toBe(false)
  })

  it('内容区四边内边距归零（顶部贴住标签条，左右不额外留白）', () => {
    const block = blockOf('.leo-content-inner')
    expect(block).toMatch(/padding:\s*0;/)
  })

  it('页面容器顶部内边距也归零（两层都要，只归零一层还剩 8px）', () => {
    const block = blockOf(
      '.leo-content-inner .ant-pro-page-container-children-container',
    )
    expect(block).toMatch(/padding-top:\s*0/)
  })
})

describe('页头排布契约', () => {
  it('顶栏 / 标签栏共用 16px 左缘（面包屑已移除）', () => {
    expect(blockOf('.app-header-bar-top')).toMatch(
      /padding:\s*0 var\(--space-md\)/,
    )
    expect(blockOf('.leo-tabbar .ant-tabs-nav')).toMatch(
      /padding:\s*0 var\(--space-md\)/,
    )
  })

  it('标签栏读成"页签条": 底色 + 可见底部分隔线(不再与页面同色)', () => {
    const strip = blockOf('.leo-tabbar-keyboard-host')
    expect(strip).toMatch(/background:\s*var\(--theme-surface-hover\)/)
    // 分隔线用 ant-color-border(#d9d9d9)：原来用 border-secondary(#f0f0f0) 与页面同色，
    // 整条读成"一行文字"，这正是"标签页不明显"的根因
    expect(strip).toMatch(/border-bottom:\s*1px solid var\(--ant-color-border/)
  })

  it('选中页签: 白底 + 主色顶条 + 抬高 2px(Excel 工作表标签的观感)', () => {
    const active = blockOf(
      '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active',
    )
    expect(active).toMatch(/background:\s*var\(--theme-surface\)/)
    // 抬高：比未选中页签高 2px，视觉上"浮起来"
    expect(active).toMatch(/height:\s*34px/)
    // 不再用卡片阴影：阴影会让页签读成"卡片"，与 Excel 页签的"贴条"语义相反
    expect(active).not.toMatch(/box-shadow/)

    const accent = blockOf(
      '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active::after',
    )
    expect(accent).toMatch(/height:\s*2px/)
    expect(accent).toMatch(/background:\s*var\(--theme-primary\)/)
  })

  it('未选中页签也有可见边框(不再是一串裸文字)', () => {
    const tab = blockOf(
      '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab',
    )
    expect(tab).toMatch(/border:\s*1px solid var\(--ant-color-border-secondary/)
    expect(tab).toMatch(/background:\s*var\(--ant-color-fill-quaternary/)
  })

  it('标签之间留缝、上圆角下直边(文件夹页签)', () => {
    expect(
      blockOf('.leo-tabbar.ant-tabs-card > .ant-tabs-nav .ant-tabs-nav-list'),
    ).toMatch(/gap:\s*var\(--space-xxs\)/)
    expect(
      blockOf(
        '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab',
      ),
    ).toMatch(
      /border-radius:\s*var\(--ant-border-radius,\s*6px\)\s+var\(--ant-border-radius,\s*6px\)\s+0\s+0/,
    )
  })
})
