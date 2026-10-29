/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DIALOG_LEVEL_2_WIDE_WIDTH,
  DIALOG_LEVEL_2_WIDTH,
  DIALOG_LEVEL_3_WIDTH,
  dialogLevelProps,
} from '@/components/dialog-levels'

const css = readFileSync(
  new URL('./dialog-levels.css', import.meta.url),
  'utf8',
)

const blockOf = (selector: string) => {
  const index = css.indexOf(`${selector} {`)
  expect(index, `未找到选择器 ${selector}`).toBeGreaterThan(-1)
  const start = css.indexOf('{', index)
  return css.slice(start + 1, css.indexOf('}', start))
}

/**
 * 嵌套弹窗（2 级 / 3 级）层级契约。
 *
 * <p>背景：2 级弹窗原来 880 宽、和 1 级 1040 只差 160，遮罩又和 1 级同档，
 * 两层的「取消/保存」看起来一样重；弹窗内容也没有限高，长列表会把关闭按钮顶出屏幕。
 * 这里锁定三件事：宽度递减、遮罩逐级加深、2 级内容区自己滚动。</p>
 */
describe('嵌套弹窗层级契约', () => {
  it('宽度按层级递减：2 级 720 / 宽版 820 明显小于 1 级 1040，3 级预览 1104', () => {
    expect(DIALOG_LEVEL_2_WIDTH).toBe(720)
    expect(DIALOG_LEVEL_2_WIDE_WIDTH).toBe(820)
    expect(DIALOG_LEVEL_3_WIDTH).toBe(1104)
    expect(DIALOG_LEVEL_2_WIDE_WIDTH).toBeLessThan(1040)
    expect(DIALOG_LEVEL_2_WIDE_WIDTH - DIALOG_LEVEL_2_WIDTH).toBe(100)
  })

  it('遮罩逐级加深，形成 1 < 2 < 3 的堆叠感', () => {
    expect(blockOf('.app-dialog-root--level-2 .ant-modal-mask')).toContain(
      'rgb(15 23 42 / 52%)',
    )
    expect(blockOf('.app-dialog-root--level-3 .ant-modal-mask')).toContain(
      'rgb(15 23 42 / 62%)',
    )
  })

  it('2 级内容区自己滚动（长内容不会把关闭按钮挤出屏幕）', () => {
    const block = blockOf('.app-dialog--level-2 .ant-modal-body')
    expect(block).toMatch(/max-height:\s*min\(64vh, 560px\)/)
    expect(block).toMatch(/overflow-y:\s*auto/)
  })

  it('层级 class 由一处生成，且能合并组件自带类名', () => {
    const level2 = dialogLevelProps(2)
    expect(level2.className).toContain('app-dialog--level-2')
    expect(level2.rootClassName).toContain('app-dialog-root--level-2')

    const level3 = dialogLevelProps(3, 'modal-top-20')
    expect(level3.className).toBe('modal-top-20 app-dialog app-dialog--level-3')
  })
})
