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
 * 页头三层的排布契约（顶栏 / 标签栏 / 面包屑 / 内容卡）。
 *
 * <p>使用者反馈「几个区域的边距不好看、标签页和面包屑不好看」。根因是左缘各走各的
 * （顶栏 logo 12、标签块 8、面包屑 16、卡片内文字 33），而标签栏透明 + 面包屑白底，
 * 形成两条几乎等高、颜色不同的带子。这里锁定统一后的口径：</p>
 * <ol>
 *   <li>左缘统一走 `--space-md`(16px)：顶栏内边距、标签栏 nav 内边距、面包屑内边距；</li>
 *   <li>标签栏铺浅灰底 + 一条下边框，面包屑不再自带白底与边框（退成一条说明文字）；</li>
 *   <li>选中的标签是"浮起的白卡片"（白底 + 细边框 + 轻阴影 + 主色文字），不是仅靠背景差。</li>
 * </ol>
 */
/**
 * 关闭面包屑后的顶部对齐。
 *
 * <p>面包屑是标签条与页面卡片之间的一行"层级说明"，留着它时需要留白把两者分开；
 * 关掉之后标签条就是唯一页眉，若仍保留 4px(内容区) + 8px(页面容器) 的顶部内边距，
 * 标签条与卡片之间会出现一条无内容的灰带，像页面没加载完。这里锁两件事：
 * ① 内容区带 `leo-content-inner--no-breadcrumb` 时顶部内边距归零；
 * ② 页面容器（antd Pro 的 children-container）顶部内边距也归零 —— 两层都要，
 *    只归零一层还剩另一层的 8px/4px。</p>
 */
describe('关闭面包屑后的顶部对齐', () => {
  it('内容区顶部内边距归零', () => {
    const block = blockOf('.leo-content-inner--no-breadcrumb')
    expect(block).toMatch(/padding-top:\s*0/)
  })

  it('页面容器顶部内边距同样归零(两层都要归零才真的贴住标签条)', () => {
    const block = blockOf(
      '.leo-content-inner--no-breadcrumb .ant-pro-page-container-children-container',
    )
    expect(block).toMatch(/padding-top:\s*0/)
  })

  it('只动顶部: 左右内边距继续保留(卡片不贴屏幕边)', () => {
    const block = blockOf('.leo-content-inner--no-breadcrumb')
    expect(block).not.toMatch(/padding:\s*0/)
    expect(block).not.toMatch(/padding-inline/)
  })
})

describe('页头排布契约', () => {
  it('顶栏 / 标签栏 / 面包屑共用 16px 左缘', () => {
    expect(blockOf('.app-header-bar-top')).toMatch(
      /padding:\s*0 var\(--space-md\)/,
    )
    expect(blockOf('.leo-tabbar .ant-tabs-nav')).toMatch(
      /padding:\s*0 var\(--space-md\)/,
    )
    expect(blockOf('.leo-breadcrumb')).toMatch(
      /padding:\s*var\(--space-xxs\) var\(--space-md\)/,
    )
  })

  it('面包屑退成说明文字: 无底色、无边框、末项加粗', () => {
    const block = blockOf('.leo-breadcrumb')
    expect(block).toMatch(/background:\s*transparent/)
    expect(block).toMatch(/border-bottom:\s*none/)
    expect(
      blockOf('.leo-breadcrumb li:last-child .ant-breadcrumb-link'),
    ).toMatch(/font-weight:\s*600/)
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
