import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import {
  resolveEditorPresentation,
  resolveEditorShowsOverlayFooter,
} from './module-editor-workspace-presentation'

/**
 * 「取消 / 保存 / 保存并审核」的落点契约。
 *
 * <p>历史两版：
 * 1. 最早挂在明细工具栏 → 切「附加费用」页签时整条工具栏被卸载，保存入口消失（P1）；
 * 2. 修法是把按钮提升到弹层 footer 槽常驻；
 * 3. 现行（按用户使用习惯）：**移回明细工具栏**，并让明细区在两个页签都渲染工具栏，
 *    用「两页签共用同一份保存组」保住「任何页签都有保存入口」这个不变量。</p>
 *
 * <p>因此 footer 槽现在只服务财务单据；有明细区的普通单据不再走 footer。</p>
 */
const configWithItems = {
  key: 'sales-order',
  itemColumns: [{ dataIndex: 'name' }],
}
const configWithoutItems = { key: 'customer', formFields: [] }

describe('resolveEditorShowsOverlayFooter', () => {
  it('有明细区的普通单据不再走 footer（按钮已移回明细工具栏）', () => {
    expect(resolveEditorShowsOverlayFooter('sales-order')).toBe(false)
    expect(resolveEditorShowsOverlayFooter('purchase-order')).toBe(false)
  })

  it('收付款单（财务布局）仍由 footer 常驻', () => {
    expect(resolveEditorShowsOverlayFooter('receipt')).toBe(true)
    expect(resolveEditorShowsOverlayFooter('payment')).toBe(true)
  })

  it('无明细区的模块不渲染 footer（按钮在表单区，避免两条按钮）', () => {
    expect(resolveEditorShowsOverlayFooter('customer')).toBe(false)
  })
})

/**
 * 「不出现两条保存按钮」是必须守住的不变量：footer 与明细工具栏互斥。
 */
describe('resolveEditorPresentation 与 footer 的互斥关系', () => {
  it('有明细区：动作在明细工具栏，footer 关闭，表单区也不出按钮', () => {
    const presentation = resolveEditorPresentation(
      configWithItems as unknown as ModulePageConfig,
      'sales-order',
    )
    expect(presentation.formActionsVisible).toBe(false)
    expect(resolveEditorShowsOverlayFooter('sales-order')).toBe(false)
  })

  it('无明细区：动作只在表单区，footer 关闭', () => {
    const presentation = resolveEditorPresentation(
      configWithoutItems as unknown as ModulePageConfig,
      'customer',
    )
    expect(presentation.formActionsVisible).toBe(true)
    expect(resolveEditorShowsOverlayFooter('customer')).toBe(false)
  })

  it('财务布局：表单区不出按钮，footer 出按钮', () => {
    const presentation = resolveEditorPresentation(
      {
        key: 'receipt',
        itemColumns: [{ dataIndex: 'name' }],
      } as unknown as ModulePageConfig,
      'receipt',
    )
    expect(presentation.financeLayout).toBe(true)
    expect(presentation.formActionsVisible).toBe(false)
    expect(resolveEditorShowsOverlayFooter('receipt')).toBe(true)
  })
})
