/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./layout-shell.css', import.meta.url), 'utf8')

/**
 * 主按钮禁用态的颜色契约。
 *
 * <p>背景：主按钮为了满足 WCAG 1.4.3（白字对底 ≥4.5:1）把实心底色压深到 `#0958d9`。
 * 这条覆盖写在全局选择器上（弹层会 portal 到 body，不能只挂 `.app-shell`），
 * 但它一度**连禁用态一起盖住**：antd 的禁用态本应是 4% 灰底 + 25% 灰字，
 * 被覆盖后变成「实心蓝底 + 灰字」——看起来像可点的主按钮、文字还发灰
 * （实测：供应商报价页「保存（0 处）」明明禁用却一片深蓝）。</p>
 *
 * <p>这里锁住"覆盖规则必须排除 `:disabled`"，避免以后调主色时又把禁用态一起带走。</p>
 */
describe('主按钮禁用态：颜色覆盖必须排除 :disabled', () => {
  it('实心主按钮的底色覆盖带 :not(:disabled)', () => {
    expect(css).toContain('.ant-btn-primary:not(:disabled) {')
    expect(css).toContain(
      '.ant-btn-color-primary.ant-btn-variant-solid:not(:disabled)',
    )
  })

  it('危险主按钮同样排除禁用态，不能把禁用按钮染成红色', () => {
    expect(css).toContain('.ant-btn-dangerous.ant-btn-primary:not(:disabled) {')
  })

  it('没有未排除禁用态的裸覆盖（否则禁用态又会被主色/错误色吃掉）', () => {
    // 行首的裸选择器 = 会命中禁用按钮的全局覆盖
    expect(css).not.toMatch(/\n\.ant-btn-primary \{/)
    expect(css).not.toMatch(/\n\.ant-btn-dangerous\.ant-btn-primary \{/)
  })

  it('hover / active 也不作用于禁用按钮', () => {
    expect(css).not.toMatch(/\n\.ant-btn-primary:hover/)
    expect(css).not.toMatch(/\n\.ant-btn-primary:active/)
  })
})
