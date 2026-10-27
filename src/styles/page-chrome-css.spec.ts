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

  it('选中的标签是浮起的白卡片, 未选中透明', () => {
    expect(blockOf('.leo-tabbar-keyboard-host')).toMatch(
      /background:\s*var\(--theme-surface-hover\)/,
    )
    const active = blockOf(
      '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active',
    )
    expect(active).toMatch(/background:\s*var\(--theme-surface\)/)
    expect(active).toMatch(/box-shadow:/)
    expect(active).toMatch(/border-color:/)
  })

  it('标签之间留缝、圆角 6px(不再是被压平的卡角)', () => {
    expect(
      blockOf('.leo-tabbar.ant-tabs-card > .ant-tabs-nav .ant-tabs-nav-list'),
    ).toMatch(/gap:\s*var\(--space-xxs\)/)
    expect(
      blockOf(
        '.leo-tabbar.ant-tabs-card.ant-tabs-top > .ant-tabs-nav .ant-tabs-tab',
      ),
    ).toMatch(/border-radius:\s*var\(--ant-border-radius,\s*6px\)/)
  })
})
