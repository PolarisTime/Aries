// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParentSelectorFooter } from './ParentSelectorFooter'

const t = (key: string) => key

describe('ParentSelectorFooter', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (
    overrides: Partial<Parameters<typeof ParentSelectorFooter>[0]> = {},
  ) => {
    act(() => {
      root.render(
        <ParentSelectorFooter
          confirmDisabled={false}
          onCancel={() => {}}
          onConfirm={() => {}}
          summary="已选 0 个订单（含 0 条明细）"
          t={t}
          {...overrides}
        />,
      )
    })
  }

  const buttons = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.parent-selector-footer-buttons button',
      ),
    )

  it('按钮组在摘要之前渲染，视觉与键盘顺序都从左到右', () => {
    render()

    const buttonsGroup = container.querySelector(
      '.parent-selector-footer-buttons',
    )
    const summary = container.querySelector('.parent-selector-footer-summary')

    expect(buttonsGroup).not.toBeNull()
    expect(summary).not.toBeNull()
    // 按钮在左、摘要在右：DOM 顺序与视觉顺序一致（用 CSS order 调换会让 Tab 顺序反向）
    expect(buttonsGroup?.compareDocumentPosition(summary as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(summary?.textContent).toBe('已选 0 个订单（含 0 条明细）')
  })

  it('取消在前、确认导入在后，且文案走翻译出口', () => {
    render()

    expect(buttons().map((button) => button.textContent)).toEqual([
      'modules.parentSelector.cancel',
      'modules.parentSelector.confirmImport',
    ])
  })

  it('未选择任何单据时确认导入禁用，取消仍可点', () => {
    render({ confirmDisabled: true })

    const [cancel, confirm] = buttons()
    expect(cancel?.disabled).toBe(false)
    expect(confirm?.disabled).toBe(true)
  })

  it('点击两个按钮分别触发对应回调', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render({ onCancel, onConfirm })

    const [cancel, confirm] = buttons()
    act(() => cancel?.click())
    act(() => confirm?.click())

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
