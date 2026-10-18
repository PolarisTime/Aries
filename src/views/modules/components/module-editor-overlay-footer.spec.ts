import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import {
  resolveEditorPresentation,
  resolveEditorShowsOverlayFooter,
} from './module-editor-workspace-presentation'

/**
 * P1-3 回归：有明细区的模块，取消/保存/保存并审核必须常驻弹层 footer 槽，
 * 与「货物明细 / 附加费用」哪个页签处于激活态无关。
 *
 * <p>判据只看 `itemColumns` 是否存在 —— 页签是明细区内部状态，一旦它参与外壳决策，
 * 切到附加费用就会再次丢按钮（历史缺陷正是如此）。</p>
 */
const configWithItems = {
  key: 'sales-order',
  itemColumns: [{ dataIndex: 'name' }],
}
const configWithoutItems = { key: 'customer', formFields: [] }

describe('resolveEditorShowsOverlayFooter', () => {
  it('有明细区的模块常驻 footer（销售订单/采购订单）', () => {
    expect(
      resolveEditorShowsOverlayFooter(
        configWithItems as unknown as ModulePageConfig,
        'sales-order',
      ),
    ).toBe(true)
    expect(
      resolveEditorShowsOverlayFooter(
        configWithItems as unknown as ModulePageConfig,
        'purchase-order',
      ),
    ).toBe(true)
  })

  it('收付款单（财务布局）本来就是 footer 常驻', () => {
    expect(
      resolveEditorShowsOverlayFooter(
        { key: 'receipt' } as unknown as ModulePageConfig,
        'receipt',
      ),
    ).toBe(true)
    expect(
      resolveEditorShowsOverlayFooter(
        {
          key: 'payment',
          itemColumns: [{ dataIndex: 'name' }],
        } as unknown as ModulePageConfig,
        'payment',
      ),
    ).toBe(true)
  })

  it('无明细区的模块不渲染 footer（按钮在表单区，避免两条按钮）', () => {
    expect(
      resolveEditorShowsOverlayFooter(
        configWithoutItems as unknown as ModulePageConfig,
        'customer',
      ),
    ).toBe(false)
  })

  it('空 itemColumns 数组视同无明细区', () => {
    expect(
      resolveEditorShowsOverlayFooter(
        { key: 'x', itemColumns: [] } as unknown as ModulePageConfig,
        'x',
      ),
    ).toBe(false)
  })
})

describe('resolveEditorPresentation 与 footer 的互斥关系', () => {
  it('有明细区时动作只在 footer：formActionsVisible=false', () => {
    const presentation = resolveEditorPresentation(
      configWithItems as unknown as ModulePageConfig,
      'sales-order',
    )
    expect(presentation.formActionsVisible).toBe(false)
    expect(
      resolveEditorShowsOverlayFooter(
        configWithItems as unknown as ModulePageConfig,
        'sales-order',
      ),
    ).toBe(true)
  })

  it('无明细区时动作只在表单区：formActionsVisible=true 且 footer=false', () => {
    const presentation = resolveEditorPresentation(
      configWithoutItems as unknown as ModulePageConfig,
      'customer',
    )
    expect(presentation.formActionsVisible).toBe(true)
    expect(
      resolveEditorShowsOverlayFooter(
        configWithoutItems as unknown as ModulePageConfig,
        'customer',
      ),
    ).toBe(false)
  })

  it('财务布局：表单区不出按钮，footer 出按钮（不会出现两个 footer）', () => {
    const presentation = resolveEditorPresentation(
      {
        key: 'receipt',
        itemColumns: [{ dataIndex: 'name' }],
      } as unknown as ModulePageConfig,
      'receipt',
    )
    expect(presentation.financeLayout).toBe(true)
    expect(presentation.formActionsVisible).toBe(false)
  })
})
