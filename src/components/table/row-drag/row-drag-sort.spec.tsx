// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ROW_DRAG_LONG_PRESS_MS } from './row-drag-config'
import { RowDragSortRow, RowDragSortScope } from './row-drag-sort'

interface Row {
  id: string
  name: string
}

const ROW_HEIGHT = 40

/** 每行一个固定矩形: jsdom 不计算布局, 碰撞检测拿到的会是 0 高 0 宽, 必须自己桩掉。 */
function stubRowRect(row: HTMLElement, index: number) {
  const top = index * ROW_HEIGHT
  row.getBoundingClientRect = () => ({
    top,
    bottom: top + ROW_HEIGHT,
    height: ROW_HEIGHT,
    left: 0,
    right: 200,
    width: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  })
}

function Harness({
  initial,
  enabled = true,
  onReorder,
}: {
  initial: Row[]
  enabled?: boolean
  onReorder: (nextIds: string[]) => void
}) {
  const [rows, setRows] = useState(initial)
  return (
    <RowDragSortScope
      enabled={enabled}
      rowIds={rows.map((row) => row.id)}
      onReorder={(nextIds) => {
        const byId = new Map(initial.map((row) => [row.id, row]))
        setRows(
          nextIds
            .map((id) => byId.get(id))
            .filter((row): row is Row => row !== undefined),
        )
        onReorder(nextIds)
      }}
    >
      <table>
        <tbody>
          {rows.map((row) => (
            <RowDragSortRow data-row-key={row.id} key={row.id}>
              <td>{row.name}</td>
            </RowDragSortRow>
          ))}
        </tbody>
      </table>
    </RowDragSortScope>
  )
}

const ROWS: Row[] = [
  { id: 'a', name: '螺纹钢' },
  { id: 'b', name: '盘螺' },
  { id: 'c', name: '高线' },
]

/**
 * 整行长按拖动排序的**行为契约**。
 *
 * <p>用户诉求是"不增加单独的拖动列, 点击长按即可拖动": 于是整行即拖动区, 必须证明
 * 三件容易被忽略的事 —— 按住不满阈值或中途位移过大不起拖(否则点击/滚动/划选全废)、
 * 从输入框/按钮上按下的长按不劫持编辑、键盘 Alt+↑↓ 与拖动等价且焦点留在被移动的行上。</p>
 *
 * <p>回退验证: 把 {@link ROW_DRAG_LONG_PRESS_MS} 改成 0(取消长按门槛)时
 * 「长按不满阈值不起拖」会变红; 去掉容差(见 row-drag-config.spec.ts)同理。</p>
 */
describe('整行长按拖动排序', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
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
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const render = (options: { enabled?: boolean; onReorder?: (ids: string[]) => void } = {}) => {
    const onReorder = options.onReorder ?? vi.fn()
    act(() => {
      root.render(
        createElement(Harness, {
          initial: ROWS,
          enabled: options.enabled ?? true,
          onReorder,
        }),
      )
    })
    const rows = Array.from(
      container.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]'),
    )
    rows.forEach(stubRowRect)
    return { onReorder, rows }
  }

  const rowAt = (index: number) =>
    container.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]')[index]

  const order = () =>
    Array.from(
      container.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]'),
    ).map((row) => row.dataset.rowKey)

  const liveText = () =>
    container.querySelector('[role="status"]')?.textContent ?? ''

  /** 按住某一行: 长按的起点。 */
  const pressRow = async (row: HTMLElement, advanceMs: number) => {
    await act(async () => {
      row.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: row.getBoundingClientRect().top + ROW_HEIGHT / 2,
        }),
      )
      await vi.advanceTimersByTimeAsync(advanceMs)
    })
  }

  const movePointerTo = async (index: number, advanceMs = 0) => {
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 20,
          clientY: index * ROW_HEIGHT + ROW_HEIGHT / 2,
        }),
      )
      if (advanceMs) await vi.advanceTimersByTimeAsync(advanceMs)
    })
  }

  const releasePointer = async () => {
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      // 假定时器下不能用真实 setTimeout 等待(会永远挂住), 必须推进假时钟
      if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
      else await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('长按不满阈值就移动/松开: 不起拖, 顺序不变', async () => {
    vi.useFakeTimers()
    const { onReorder } = render()

    await pressRow(rowAt(0), ROW_DRAG_LONG_PRESS_MS - 120)
    await movePointerTo(2)
    await releasePointer()

    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('长按满阈值后不移动就松开: 不起拖(避免长按即误重排)', async () => {
    vi.useFakeTimers()
    const { onReorder } = render()

    await pressRow(rowAt(0), ROW_DRAG_LONG_PRESS_MS + 40)
    await movePointerTo(0)
    await releasePointer()

    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('长按满阈值后移到下一行: 行序按新顺序写回并播报', async () => {
    vi.useFakeTimers()
    const { onReorder } = render()

    await pressRow(rowAt(0), ROW_DRAG_LONG_PRESS_MS + 40)
    await movePointerTo(1)
    await releasePointer()

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(order()).toEqual(['b', 'a', 'c'])
    // 读屏用户拿不到视觉反馈: 落位必须播报"第几行到了第几位"
    expect(liveText()).toContain('第 1 行已移动到第 2 位')
  })

  it('落位后焦点留在被移动的那一行(而不是跳回第一行)', async () => {
    vi.useFakeTimers()
    const { onReorder } = render()

    await pressRow(rowAt(0), ROW_DRAG_LONG_PRESS_MS + 40)
    await movePointerTo(1)
    await releasePointer()

    expect(onReorder).toHaveBeenCalled()
    const moved = container.querySelector<HTMLTableRowElement>(
      'tr[data-row-key="a"]',
    )
    expect(document.activeElement).toBe(moved)
  })

  it('行内输入控件上按下的长按不起拖(不劫持编辑与划选)', async () => {
    vi.useFakeTimers()
    const { onReorder, rows } = render()
    const input = document.createElement('input')
    rows[0].querySelector('td')?.appendChild(input)
    stubRowRect(rows[0], 0)

    await act(async () => {
      input.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: ROW_HEIGHT / 2,
        }),
      )
      await vi.advanceTimersByTimeAsync(ROW_DRAG_LONG_PRESS_MS + 40)
    })
    await movePointerTo(1)
    await releasePointer()

    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('行内按钮上按下的长按不起拖(删除/拆分等点选动作不能被抢)', async () => {
    vi.useFakeTimers()
    const { onReorder, rows } = render()
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = '删除'
    rows[0].querySelector('td')?.appendChild(button)

    await act(async () => {
      button.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: ROW_HEIGHT / 2,
        }),
      )
      await vi.advanceTimersByTimeAsync(ROW_DRAG_LONG_PRESS_MS + 40)
    })
    await movePointerTo(1)
    await releasePointer()

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('Alt+↓ 下移一行: 与拖动等价, 播报并把焦点留在该行', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    await act(async () => {
      rows[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(order()).toEqual(['b', 'a', 'c'])
    expect(liveText()).toContain('第 1 行已移动到第 2 位')
    expect(document.activeElement).toBe(
      container.querySelector('tr[data-row-key="a"]'),
    )
  })

  it('Alt+↑ 上移一行, 首行时越界不写回', async () => {
    const { onReorder, rows } = render()
    act(() => rows[2].focus())

    await act(async () => {
      rows[2].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(onReorder).toHaveBeenLastCalledWith(['a', 'c', 'b'])

    const first = rowAt(0)
    act(() => first.focus())
    await act(async () => {
      first.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    // 首行再往上: 不越界, 不产生新的顺序写回
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(order()).toEqual(['a', 'c', 'b'])
  })

  it('未按 Alt 的方向键不移动行(避免抢走表格内的正常方向键)', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    await act(async () => {
      rows[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('拖动关闭时既不起拖也不响应 Alt+↑↓(只读/上游派生场景)', async () => {
    vi.useFakeTimers()
    const { onReorder, rows } = render({ enabled: false })

    await pressRow(rowAt(0), ROW_DRAG_LONG_PRESS_MS + 40)
    await movePointerTo(1)
    await releasePointer()
    act(() => rows[0].focus())
    await act(async () => {
      rows[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onReorder).not.toHaveBeenCalled()
    // 关闭拖动时行不该占 Tab 序, 也不该声明拖动快捷键
    expect(rowAt(0)?.getAttribute('aria-keyshortcuts')).toBeNull()
  })
})
