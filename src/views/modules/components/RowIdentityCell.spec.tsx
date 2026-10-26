// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('首位身份列（序号 · 勾选 · 明细加号 · 行菜单 同格）', () => {
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

  const identity = () =>
    container.querySelector<HTMLElement>('.module-row-identity')

  it('四件套按 序号 → 勾选 → 明细 → 行菜单 的顺序落在同一格', () => {
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
        }),
      )
    })

    const cell = identity()
    expect(cell).not.toBeNull()
    expect(cell?.children).toHaveLength(4)
    expect(cell?.children[0].textContent).toBe('21')
    expect(cell?.children[0].className).toContain('module-row-identity-seq')
    expect(cell?.children[1].tagName).toBe('INPUT')
    expect(cell?.children[2].getAttribute('data-testid')).toBe('detail-toggle')
    expect(cell?.children[3].getAttribute('aria-label')).toBe(
      '「SO-1」行操作菜单',
    )
  })

  it('该行没有行菜单时不渲染 ⋮（避免空按钮）', () => {
    act(() => {
      root.render(
        createElement(RowIdentityCell, {
          sequenceNumber: 1,
          checkbox: null,
          detailToggle: null,
          menu: undefined,
        }),
      )
    })

    expect(container.querySelector('button[aria-haspopup="menu"]')).toBeNull()
    expect(identity()?.children).toHaveLength(1)
  })

  it('表头用同一套栅格类, 并原样渲染全选复选框节点', () => {
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

    const head = identity()
    expect(head?.className).toContain('module-row-identity--head')
    expect(head?.children[0].textContent).toBe('序号')
    expect(head?.children[1].getAttribute('aria-label')).toBe(
      '全选当前页所有行',
    )
  })

  it('行菜单按钮声明 popup 语义与可访问名(与右键同一份配置)', () => {
    const onOpen = vi.fn()
    act(() => {
      root.render(
        createElement(RowIdentityCell, {
          sequenceNumber: 3,
          checkbox: null,
          detailToggle: null,
          menu: { ...menu, onOpen },
        }),
      )
    })

    const button = container.querySelector<HTMLButtonElement>(
      'button.module-row-more-actions',
    )
    expect(button?.getAttribute('aria-haspopup')).toBe('menu')
    expect(button?.getAttribute('aria-label')).toBe('「SO-1」行操作菜单')
  })
})
