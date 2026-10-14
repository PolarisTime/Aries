/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 主数据表单「长说明」的无障碍契约(样式层)。
 *
 * <p>说明同时作为 `Form.Item` 的 `tooltip`(标签旁 ⓘ)与 `extra` 下发: `extra` 被 CSS 视觉
 * 收起, 但仍是控件 `aria-describedby` 的落点。antd 自己渲染的 ⓘ 是硬编码
 * `tabIndex=-1` 的 span(见 master-form-extra.spec.tsx), 纯键盘用户 Tab 不到;
 * 因此键盘路径必须由 CSS 在字段获得焦点时把 `extra` 还原出来 —— 这条规则一旦被删掉,
 * 不依赖读屏的键盘用户就再也读不到长说明。</p>
 */

const overlayCss = readFileSync(
  new URL('../../styles/workspace-overlay.css', import.meta.url),
  'utf8',
)

const blockOf = (selector: string) => {
  const index = overlayCss.indexOf(selector)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = overlayCss.indexOf('{', index)
  return overlayCss.slice(start, overlayCss.indexOf('}', start))
}

describe('主数据表单说明的键盘可达性(样式契约)', () => {
  it('说明默认视觉收起, 但不从无障碍树移除(clip 而非 display:none)', () => {
    const hidden = blockOf('.master-form .ant-form-item-extra {')
    expect(hidden).toMatch(/clip-path:\s*inset\(50%\)/)
    expect(hidden).not.toContain('display: none')
    expect(hidden).not.toContain('visibility: hidden')
  })

  it('字段获得焦点时说明还原为正常排版(纯键盘用户不靠鼠标也能读到)', () => {
    const revealed = blockOf(
      '.master-form .ant-form-item:focus-within .ant-form-item-extra',
    )
    expect(revealed).toMatch(/position:\s*static/)
    expect(revealed).toMatch(/width:\s*auto/)
    expect(revealed).toMatch(/height:\s*auto/)
    expect(revealed).toMatch(/clip-path:\s*none/)
    expect(revealed).toMatch(/overflow:\s*visible/)
    expect(revealed).toMatch(/white-space:\s*normal/)
  })
})
