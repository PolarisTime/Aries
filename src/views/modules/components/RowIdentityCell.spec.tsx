// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  RowIdentityCell,
  RowIdentityHeader,
} from '@/views/modules/components/RowIdentityCell'

describe('首位身份列：序号⇄勾选 + 明细按钮', () => {
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

  const cell = () =>
    container.querySelector<HTMLElement>('.module-row-identity')

  function render(props: Partial<Parameters<typeof RowIdentityCell>[0]>) {
    act(() => {
      root.render(
        createElement(RowIdentityCell, {
          sequenceNumber: 21,
          checkbox: createElement('input', { type: 'checkbox' }),
          detailToggle: createElement('button', {
            type: 'button',
            'data-testid': 'detail-toggle',
          }),
          selected: false,
          ...props,
        }),
      )
    })
  }

  it('两组: 选择器槽位(序号+勾选框) 与 动作区(只剩明细按钮)', () => {
    render({})
    const identity = cell()
    expect(identity?.children).toHaveLength(2)

    const selector = identity?.querySelector('.module-row-identity-selector')
    // 序号徽标与 antd 勾选框同处一个槽位: 常态显示序号, 悬停/勾选时换成勾选框
    expect(selector?.children).toHaveLength(2)
    expect(selector?.children[0].textContent).toBe('21')
    expect(selector?.children[0].className).toContain('module-row-identity-seq')
    expect(selector?.children[1].tagName).toBe('INPUT')

    const actions = identity?.querySelector('.module-row-identity-actions')
    expect(actions?.children).toHaveLength(1)
    expect(
      actions?.querySelector('[data-testid="detail-toggle"]'),
    ).not.toBeNull()
  })

  it('行菜单的可见「⋮」按钮已移除(入口改由右键/长按/Shift+F10)', () => {
    render({})
    expect(container.querySelector('button.module-row-more-actions')).toBeNull()
    expect(container.querySelector('button[aria-haspopup="menu"]')).toBeNull()
  })

  it('已勾选的行带 module-row-identity--selected, 未勾选不带', () => {
    render({ selected: true })
    expect(cell()?.className).toContain('module-row-identity--selected')

    render({ selected: false })
    expect(cell()?.className).not.toContain('module-row-identity--selected')
  })

  it('该行没有明细入口时动作区为空(不留空按钮)', () => {
    render({ detailToggle: null, checkbox: null })
    expect(
      cell()?.querySelector('.module-row-identity-actions')?.children,
    ).toHaveLength(0)
  })

  it('表头: 全选复选框占第一个槽位, 列名跟在后面', () => {
    act(() => {
      root.render(
        createElement(RowIdentityHeader, {
          label: '序号',
          selectAll: createElement('input', {
            type: 'checkbox',
            'aria-label': '全选当前页所有行',
          }),
        }),
      )
    })

    const head = cell()
    expect(head?.className).toContain('module-row-identity--head')
    // 全选复选框与行内勾选框同位, 才能正对着每一行
    expect(
      head
        ?.querySelector('.module-row-identity-selector')
        ?.querySelector('input[aria-label="全选当前页所有行"]'),
    ).not.toBeNull()
    expect(
      head?.querySelector('.module-row-identity-head-label')?.textContent,
    ).toBe('序号')
  })
})
