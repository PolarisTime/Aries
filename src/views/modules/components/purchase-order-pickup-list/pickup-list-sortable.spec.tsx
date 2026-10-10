// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { RowContextMenuContext } from '@/components/row-context-menu'
import { SortableRow } from './pickup-list-sortable'

/**
 * 拖动接线契约。
 *
 * <p>背景(2026-10 实际踩坑): 提货单把 `PointerSensor` 换成 `MouseSensor` 后,
 * 取值仍是 `listeners.onPointerDown` —— 而 MouseSensor 声明的事件名是 `onMouseDown`,
 * 于是鼠标整行拖动**完全没接线**, 且不报错、UI 无变化, 只有人工点一下才发现。
 * 因此这里逆向断言: 传感器声明了哪些事件名, 行上就必须真的转发哪些。</p>
 */

/** 用一个假的 useSortable 返回可控的 listeners, 覆盖"传感器换名"这一失效场景。 */
const sortable = vi.hoisted<{ listeners: Record<string, unknown> }>(() => ({
  listeners: {},
}))

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    useSortable: () => ({
      // 刻意带 role="button": 组件必须**不**把它透传到 <tr>(会破坏表格语义)
      attributes: { role: 'button', tabIndex: 0 },
      listeners: sortable.listeners,
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  }
})

describe('提货明细行拖动接线', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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
    vi.clearAllMocks()
  })

  const renderRow = () => {
    const menus = new Map([
      [
        '1',
        { ariaLabel: '「螺纹钢」行操作菜单', items: [], onClick: () => {} },
      ],
    ])
    act(() => {
      root.render(
        createElement(
          DndContext,
          null,
          createElement(
            RowContextMenuContext.Provider,
            { value: menus },
            createElement(
              'table',
              null,
              createElement(
                'tbody',
                null,
                createElement(SortableRow, {
                  'data-row-key': '1',
                }),
              ),
            ),
          ),
        ),
      )
    })
    return container.querySelector<HTMLTableRowElement>(
      '.ant-table-tbody tr, tbody tr',
    )
  }

  it('传感器声明的每个事件名都被转发到行上(含 MouseSensor 的 onMouseDown)', () => {
    const onMouseDown = vi.fn()
    const onTouchStart = vi.fn()
    const onKeyDown = vi.fn()
    sortable.listeners = { onMouseDown, onTouchStart, onKeyDown }

    const tr = renderRow()
    expect(tr).toBeTruthy()

    act(() => {
      tr?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      tr?.dispatchEvent(new Event('touchstart', { bubbles: true }))
      tr?.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      )
    })

    // 三个都必须在: 任何一个漏转发, 对应输入方式就完全拖不动
    expect(onMouseDown).toHaveBeenCalledTimes(1)
    expect(onTouchStart).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('不透传 dnd-kit 的 attributes: 行必须是 row, 不能变成 button', () => {
    sortable.listeners = { onMouseDown: vi.fn() }
    const tr = renderRow()
    // role="button" 会破坏表格语义(行应为 row)
    expect(tr?.getAttribute('role')).not.toBe('button')
  })

  it('行可聚焦, 并声明键盘拖动与行菜单快捷键', () => {
    sortable.listeners = { onMouseDown: vi.fn() }
    const tr = renderRow()
    expect(tr?.getAttribute('tabindex')).toBe('0')
    expect(tr?.getAttribute('aria-keyshortcuts')).toContain('Shift+F10')
  })

  it('输入控件上的按下不启动拖动(不劫持编辑)', () => {
    const onMouseDown = vi.fn()
    sortable.listeners = { onMouseDown }
    const tr = renderRow()
    expect(tr).toBeTruthy()

    const input = document.createElement('input')
    tr?.appendChild(input)
    act(() => {
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    // 冒泡到行, 但放行判定应拦下: 否则在数量/备注框里按住就会被拖走整行
    expect(onMouseDown).not.toHaveBeenCalled()
  })
})
