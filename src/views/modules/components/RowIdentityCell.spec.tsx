// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RowContextMenuConfig } from '@/components/row-context-menu'
import {
  RowIdentityCell,
  RowIdentityHeader,
} from '@/views/modules/components/RowIdentityCell'

const menu: RowContextMenuConfig = {
  ariaLabel: '「SO-1」行操作菜单',
  items: [],
  onClick: () => {},
}

describe('首位身份列：序号⇄勾选 + 动作组', () => {
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
          menu,
          selected: false,
          ...props,
        }),
      )
    })
  }

  it('只分两组: 选择器槽位(序号+勾选框) 与 动作组(明细+行菜单)', () => {
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
    expect(actions?.children).toHaveLength(2)
    expect(
      actions?.querySelector('[data-testid="detail-toggle"]'),
    ).not.toBeNull()
    expect(
      actions?.querySelector('button[aria-haspopup="menu"]'),
    ).not.toBeNull()
  })

  it('已勾选的行带 module-row-identity--selected, 未勾选不带', () => {
    render({ selected: true })
    expect(cell()?.className).toContain('module-row-identity--selected')

    render({ selected: false })
    expect(cell()?.className).not.toContain('module-row-identity--selected')
  })

  it('该行没有行菜单时不渲染 ⋮（避免空按钮）', () => {
    render({ menu: undefined, checkbox: null, detailToggle: null })
    expect(container.querySelector('button[aria-haspopup="menu"]')).toBeNull()
    expect(
      cell()?.querySelector('.module-row-identity-actions')?.children,
    ).toHaveLength(0)
  })

  it('行菜单按钮声明 popup 语义与可访问名(与右键同一份配置)', () => {
    render({})
    const button = container.querySelector<HTMLButtonElement>(
      'button.module-row-more-actions',
    )
    expect(button?.getAttribute('aria-haspopup')).toBe('menu')
    expect(button?.getAttribute('aria-label')).toBe('「SO-1」行操作菜单')
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
