// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import { focusFirstEditableItemCell } from './module-editor-item-focus'
import {
  buildModuleEditorItemDuplicateColumn,
  EDITOR_ITEM_ACTIONS_COLUMN_KEY,
} from './module-editor-item-row-actions'

const record: ModuleLineItem = { id: 'row-1', materialCode: 'M-001' }

describe('buildModuleEditorItemDuplicateColumn 行操作按钮列', () => {
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
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const renderColumn = (options: {
    disabled?: boolean
    onDuplicate: (itemId: string) => void
  }) => {
    const column = buildModuleEditorItemDuplicateColumn({
      title: '操作',
      actionLabel: '复制本行',
      ariaLabelOf: (item) => `复制本行：${String(item.id)}`,
      disabled: options.disabled ?? false,
      onDuplicate: options.onDuplicate,
    })

    expect(column.key).toBe(EDITOR_ITEM_ACTIONS_COLUMN_KEY)

    const node = (
      column as {
        render: (value: unknown, item: ModuleLineItem) => React.ReactNode
      }
    ).render(undefined, record)

    act(() => {
      root.render(createElement('div', null, node))
    })
    return container.querySelector('button')
  }

  it('渲染「复制本行」按钮并带逐行可访问名', () => {
    const button = renderColumn({ onDuplicate: vi.fn() })

    expect(button?.textContent).toContain('复制本行')
    expect(button?.getAttribute('aria-label')).toBe('复制本行：row-1')
    expect(button?.getAttribute('title')).toBe('复制本行')
  })

  it('点击把该行 id 交给调用方（复制语义由数据层实现）', () => {
    const onDuplicate = vi.fn()
    const button = renderColumn({ onDuplicate })

    act(() => {
      button?.click()
    })

    expect(onDuplicate).toHaveBeenCalledTimes(1)
    expect(onDuplicate).toHaveBeenCalledWith('row-1')
  })

  it('只读/明细锁定时按钮禁用且不可点击', () => {
    const onDuplicate = vi.fn()
    const button = renderColumn({ onDuplicate, disabled: true })

    expect(button?.disabled).toBe(true)
    act(() => {
      button?.click()
    })
    expect(onDuplicate).not.toHaveBeenCalled()
  })
})

describe('focusFirstEditableItemCell 焦点落到新行首格', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('优先聚焦行内第一个非勾选列的可编辑输入', () => {
    container.innerHTML = `
      <table><tbody>
      <tr data-row-key="row-2">
        <td><input type="checkbox" /></td>
        <td><input id="material" /></td>
        <td><input id="quantity" /></td>
      </tr>
      </tbody></table>
    `
    const row = container.querySelector<HTMLElement>('tr')

    expect(focusFirstEditableItemCell(row)).toBe(true)
    expect(document.activeElement?.id).toBe('material')
  })

  it('行内没有输入控件时回落到第一个可聚焦元素', () => {
    container.innerHTML = `
      <table><tbody>
      <tr data-row-key="row-2">
        <td><input type="checkbox" /></td>
        <td><div id="fallback" tabindex="0"></div></td>
      </tr>
      </tbody></table>
    `
    const row = container.querySelector<HTMLElement>('tr')

    expect(focusFirstEditableItemCell(row)).toBe(true)
    expect(document.activeElement?.id).toBe('fallback')
  })

  it('行不存在或没有可聚焦元素时返回 false，不抛异常', () => {
    expect(focusFirstEditableItemCell(null)).toBe(false)

    container.innerHTML =
      '<table><tbody><tr><td><input type="checkbox" /></td></tr></tbody></table>'
    expect(
      focusFirstEditableItemCell(container.querySelector<HTMLElement>('tr')),
    ).toBe(false)
  })
})
