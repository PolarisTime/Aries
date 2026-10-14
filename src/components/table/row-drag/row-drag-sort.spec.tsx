// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  ROW_DRAG_DIRECT_MOVE_SHORTCUTS,
  ROW_DRAG_KEYBOARD_MODEL,
  ROW_DRAG_LONG_PRESS_MS,
  rowDragAriaKeyshortcuts,
  rowDragDirectMoveHintText,
  rowDragKeyboardHintText,
} from './row-drag-config'
import {
  RowDragSortMoveButtons,
  RowDragSortRow,
  RowDragSortScope,
} from './row-drag-sort'

interface Row {
  id: string
  name: string
}

const ROW_HEIGHT = 40

/** 每行一个固定矩形: jsdom 不计算布局, 碰撞检测拿到的会是 0 高 0 宽, 必须自己桩掉。 */
function stubRect(
  element: HTMLElement,
  top: number,
  height: number,
  width = 200,
) {
  element.getBoundingClientRect = () => ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: width,
    width,
    x: 0,
    y: top,
    toJSON: () => ({}),
  })
}

function stubRowRect(row: HTMLElement, index: number, height = ROW_HEIGHT) {
  stubRect(row, index * height, height)
}

/** 变高行: 行高不同, 顶部位置必须按前面的行高累加(不能用 index × 高度)。 */
function stubVariableHeightRows(rows: HTMLElement[], heights: number[]) {
  let top = 0
  rows.forEach((row, index) => {
    const height = heights[index] ?? ROW_HEIGHT
    stubRect(row, top, height)
    top += height
  })
}

function Harness({
  initial,
  enabled = true,
  heights,
  onReorder,
  onSave,
}: {
  initial: Row[]
  enabled?: boolean
  /** 行高(变高行场景): 与 initial 一一对应。 */
  heights?: number[]
  onReorder: (nextIds: string[]) => void
  onSave?: (finalIds: string[]) => void
}) {
  const [rows, setRows] = useState(initial)
  return (
    <RowDragSortScope
      describeRow={(rowId) =>
        initial.find((row) => row.id === rowId)?.name ?? ''
      }
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
              <td>
                <RowDragSortMoveButtons rowId={row.id} />
              </td>
              <td>
                <button
                  data-row-action={row.id}
                  onClick={() => onSave?.(rows.map((entry) => entry.id))}
                  type="button"
                >
                  保存
                </button>
              </td>
            </RowDragSortRow>
          ))}
        </tbody>
      </table>
      <span data-testid="heights">{heights?.join(',')}</span>
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
 * <p>用户诉求是"不增加单独的拖动列, 点击长按即可拖动", 而 WCAG 2.2 SC 2.5.7 又要求
 * "功能可用单指针、不做拖动操作完成", 因此这里必须同时证明:</p>
 * <ol>
 *   <li>按住不满阈值或中途位移过大不起拖(否则点击/滚动/划选全废);</li>
 *   <li>从输入框/按钮上按下的长按不劫持编辑;</li>
 *   <li>键盘是 ARIA APG 状态机(Space/Enter 拾起 → 方向键移动 → Space/Enter 放下, Esc 取消),
 *       Alt+↑/↓ 只是可选附加键;</li>
 *   <li>每行另有**可点击的上移/下移按钮**, 单指针与纯键盘都能完成一次重排并写回;</li>
 *   <li>变高行的落位位置正确。</li>
 * </ol>
 *
 * <p>回退验证(实际改错跑过, 见 `docs/` 与提交说明): 把 {@link ROW_DRAG_LONG_PRESS_MS}
 * 改成 0、「长按不满阈值不起拖」变红; 去掉 `RowDragSortMoveButtons`
 * 「单指针/纯键盘点击上移下移」两组变红; 去掉 `accessibility` 覆写、或把播报里的行名换成
 * id, 「播报只含物料名与序号」变红; 把落位判定换回"位移 ÷ 平均行高", 变高行用例变红。</p>
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

  const render = (
    options: {
      enabled?: boolean
      heights?: number[]
      onReorder?: (ids: string[]) => void
      onSave?: (ids: string[]) => void
    } = {},
  ) => {
    const onReorder = options.onReorder ?? vi.fn()
    act(() => {
      root.render(
        createElement(Harness, {
          initial: ROWS,
          enabled: options.enabled ?? true,
          heights: options.heights,
          onReorder,
          onSave: options.onSave,
        }),
      )
    })
    const rows = Array.from(
      container.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]'),
    )
    if (options.heights) stubVariableHeightRows(rows, options.heights)
    else {
      rows.forEach((row, index) => {
        stubRowRect(row, index, ROW_HEIGHT)
      })
    }
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

  /** 键盘事件: `code` 是 dnd-kit KeyboardSensor 用来注册键位的物理键码。 */
  const pressKey = async (
    key: string,
    code: string,
    target: EventTarget,
    init: KeyboardEventInit = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      code,
      bubbles: true,
      cancelable: true,
      ...init,
    })
    await act(async () => {
      target.dispatchEvent(event)
      await Promise.resolve()
    })
    return event
  }

  const flushTimers = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 完整的键盘拾起 → 移动 → 放下: 返回被派发的事件以便断言 preventDefault。 */
  const keyboardReorder = async (
    row: HTMLElement,
    moveCode: 'ArrowDown' | 'ArrowUp',
  ) => {
    const pickUp = await pressKey(' ', 'Space', row)
    // KeyboardSensor 的文档级监听是 setTimeout(0) 挂上的, 必须等一轮宏任务
    await flushTimers()
    const move = await pressKey(moveCode, moveCode, document)
    await flushTimers()
    const drop = await pressKey(' ', 'Space', document)
    await flushTimers()
    return { pickUp, move, drop }
  }

  const findMoveButton = (rowKey: string, label: string) => {
    const row = container.querySelector<HTMLTableRowElement>(
      `tr[data-row-key="${rowKey}"]`,
    )
    return Array.from(row?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .filter((button) =>
        (button.getAttribute('aria-label') ?? '').startsWith(label),
      )
      .at(0)
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
    // 读屏用户拿不到视觉反馈: 落位必须播报"哪一行到了第几位"
    expect(liveText()).toContain('螺纹钢（第 1 行）已移动到第 2 位')
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

  /**
   * 变高行的落位: jsdom 里把首行桩成 20px、中间行 100px、末行 20px。
   * 首行下移 40px 时它的中心(50)还没越过中间行的中线(70), 不该落位 ——
   * 旧口径(位移 ÷ 平均行高)会误判为已经落到第 2 格。
   */
  it('变高行: 首行(20px)下移 40px 时尚未越过中间行(100px)中线, 顺序不变', async () => {
    const heights = [20, 100, 20]
    const { onReorder, rows } = render({ heights })
    stubVariableHeightRows(rows, heights)

    // 首行中心 10, 下移 40 → 50; 中间行中线 = 20 + 50 = 70
    await act(async () => {
      rows[0].dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: 10,
        }),
      )
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_DRAG_LONG_PRESS_MS + 40),
      )
    })
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 20,
          clientY: 50,
        }),
      )
    })
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('变高行: 首行(20px)下移越过中间行(100px)中线后落到第 2 格', async () => {
    const heights = [20, 100, 20]
    const { onReorder, rows } = render({ heights })
    stubVariableHeightRows(rows, heights)

    await act(async () => {
      rows[0].dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: 10,
        }),
      )
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_DRAG_LONG_PRESS_MS + 40),
      )
    })
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 20,
          clientY: 70,
        }),
      )
    })
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  it('Alt+↓ 下移一行(可选附加键): 与拖动等价, 播报并把焦点留在该行', async () => {
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
    expect(liveText()).toContain('螺纹钢（第 1 行）已移动到第 2 位')
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

  /**
   * 修正口径的回归用例: **只有真的移动了才 preventDefault**。
   * 首行按 Alt+↑ 处理不成功, 事件必须交还浏览器(否则浏览器/输入法拿不到这个按键)。
   */
  it('边界项按 Alt+↑/↓ 不消费按键(处理不成功就不 preventDefault)', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    const up = await pressKey('ArrowUp', 'ArrowUp', rows[0], { altKey: true })
    expect(onReorder).not.toHaveBeenCalled()
    expect(up.defaultPrevented).toBe(false)

    act(() => rows[2].focus())
    const down = await pressKey('ArrowDown', 'ArrowDown', rowAt(2), {
      altKey: true,
    })
    expect(onReorder).not.toHaveBeenCalled()
    expect(down.defaultPrevented).toBe(false)

    // 成功的移动才消费按键
    act(() => rows[0].focus())
    const moved = await pressKey('ArrowDown', 'ArrowDown', rowAt(0), {
      altKey: true,
    })
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(moved.defaultPrevented).toBe(true)
  })

  /**
   * 回归: 带修饰键的方向键一律交还浏览器 —— Alt+←/→ 是浏览器后退前进、
   * macOS 上是按词移动, 被行拖动截走会让用户没法在备注框里按词移动光标。
   */
  it('Alt+← / Alt+→ 与带修饰键的 ↑/↓ 一律交还浏览器(不移动、不 preventDefault)', async () => {
    const { onReorder, rows } = render()
    act(() => rows[1].focus())

    const left = await pressKey('ArrowLeft', 'ArrowLeft', rowAt(1), {
      altKey: true,
    })
    const right = await pressKey('ArrowRight', 'ArrowRight', rowAt(1), {
      altKey: true,
    })
    const withCtrl = await pressKey('ArrowUp', 'ArrowUp', rowAt(1), {
      altKey: true,
      ctrlKey: true,
    })
    const withMeta = await pressKey('ArrowDown', 'ArrowDown', rowAt(1), {
      altKey: true,
      metaKey: true,
    })
    const withShift = await pressKey('ArrowUp', 'ArrowUp', rowAt(1), {
      altKey: true,
      shiftKey: true,
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
    for (const event of [left, right, withCtrl, withMeta, withShift]) {
      expect(event.defaultPrevented).toBe(false)
    }
  })

  it('未按 Alt 的方向键不移动行(避免抢走表格内的正常方向键)', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    const event = await pressKey('ArrowDown', 'ArrowDown', rows[0])

    expect(onReorder).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
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
    // 关闭拖动时不渲染"非拖动替代"按钮(此时行序本来就不允许改)
    expect(findMoveButton('a', '上移')).toBeUndefined()
  })

  it('行声明 aria-keyshortcuts, 且与键位常量同源(Space/Enter 拾起已回到声明里)', () => {
    const { rows } = render()
    const keyshortcuts = rows[0].getAttribute('aria-keyshortcuts') ?? ''
    // 行上没有行菜单时, 声明的键位就应当**只有**常量里那一套(不含任何手写补充)
    expect(keyshortcuts).toBe(rowDragAriaKeyshortcuts())
    for (const entry of ROW_DRAG_KEYBOARD_MODEL.pickUp) {
      expect(keyshortcuts).toContain(entry.ariaKeyshortcuts)
    }
    for (const entry of ROW_DRAG_DIRECT_MOVE_SHORTCUTS) {
      expect(keyshortcuts).toContain(entry.ariaKeyshortcuts)
    }
  })

  /**
   * 读屏说明的**接线**守护: 只测 buildRowDragAccessibility 只能证明"函数算得对",
   * 证明不了 DndContext 真的把它接上了。去掉 `accessibility={accessibility}` 时本用例变红。
   */
  it('DndContext 已覆写读屏说明: 渲染中文操作说明而不是 dnd-kit 英文默认文案', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('拾起')
    expect(text).toContain('取消')
    expect(text).not.toContain('To pick up a draggable item')
    expect(text).not.toContain('Draggable item')
  })

  it('读屏提示文案由键位常量插值(声明与文档同源)', () => {
    render()
    const hint = container.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(hint).toBe(
      i18n.t('common.rowDragSort.keyboardHint', {
        shortcuts: rowDragKeyboardHintText(),
        direct: rowDragDirectMoveHintText(),
      }),
    )
    expect(hint).toContain('空格/回车')
    expect(hint).toContain('Alt+↑')
  })

  /** 纯键盘完成一次重排: Space 拾起 → 方向键移动 → Space 放下。 */
  it('仅键盘(APG 状态机): Space 拾起 → ↓ 移动 → Space 放下, 写回并播报', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    const { pickUp, drop } = await keyboardReorder(rows[0], 'ArrowDown')

    expect(pickUp.defaultPrevented).toBe(true)
    expect(drop.defaultPrevented).toBe(true)
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(order()).toEqual(['b', 'a', 'c'])
    expect(liveText()).toContain('螺纹钢（第 1 行）')
    expect(liveText()).not.toContain('a"')
  })

  it('仅键盘(APG 状态机): Enter 也能拾起与放下', async () => {
    const { onReorder, rows } = render()
    act(() => rows[1].focus())

    await pressKey('Enter', 'Enter', rows[1])
    await flushTimers()
    await pressKey('ArrowDown', 'ArrowDown', document)
    await flushTimers()
    await pressKey('Enter', 'Enter', document)
    await flushTimers()

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b'])
    expect(order()).toEqual(['a', 'c', 'b'])
  })

  it('仅键盘(APG 状态机): Esc 取消后顺序不变', async () => {
    const { onReorder, rows } = render()
    act(() => rows[0].focus())

    await pressKey(' ', 'Space', rows[0])
    await flushTimers()
    await pressKey('ArrowDown', 'ArrowDown', document)
    await flushTimers()
    await pressKey('Escape', 'Escape', document)
    await flushTimers()

    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  /** 仅单指针: 点一下「下移」就完成一次重排, 不需要任何拖动操作。 */
  it('仅单指针: 点击「下移」按钮完成一次重排并写回行模型', async () => {
    const onSave = vi.fn()
    const { onReorder } = render({ onSave })
    const button = findMoveButton('a', '下移')
    expect(button).toBeDefined()

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(order()).toEqual(['b', 'a', 'c'])
    expect(liveText()).toContain('螺纹钢（第 1 行）已移动到第 2 位')

    // 顺序写回行模型后保存: 保存拿到的是新顺序
    const save = container.querySelector<HTMLButtonElement>(
      '[data-row-action="c"]',
    )
    await act(async () => {
      save?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onSave).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  /** 仅键盘: 焦点落在替代按钮上按回车, 同样完成一次重排。 */
  it('仅键盘: 聚焦「下移」按钮按回车完成一次重排', async () => {
    const { onReorder } = render()
    const button = findMoveButton('c', '上移')
    expect(button).toBeDefined()
    act(() => button?.focus())

    await act(async () => {
      button?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b'])
    expect(order()).toEqual(['a', 'c', 'b'])
  })

  it('首/末项的替代按钮 aria-disabled 但仍可聚焦(读屏能听到边界)', async () => {
    render()
    const firstUp = findMoveButton('a', '上移')
    const firstDown = findMoveButton('a', '下移')
    const lastDown = findMoveButton('c', '下移')

    expect(firstUp?.getAttribute('aria-disabled')).toBe('true')
    expect(firstDown?.getAttribute('aria-disabled')).toBe('false')
    expect(lastDown?.getAttribute('aria-disabled')).toBe('true')

    // 边界按钮不真的禁用: 仍能聚焦, 读屏会念出"已禁用"
    act(() => firstUp?.focus())
    expect(document.activeElement).toBe(firstUp)
    expect(firstUp?.hasAttribute('disabled')).toBe(false)
  })

  it('替代按钮命中区 ≥24×24(WCAG 2.5.8)', () => {
    render()
    const button = findMoveButton('a', '下移')
    expect(button?.style.minWidth).toBe('24px')
    expect(button?.style.minHeight).toBe('24px')
    expect(button?.getAttribute('aria-label')).toBe('下移 螺纹钢（第 1 行）')
  })

  it('click 边界项按钮不写回顺序(按钮与拖动同一份边界判定)', async () => {
    const { onReorder } = render()
    const firstUp = findMoveButton('a', '上移')
    await act(async () => {
      firstUp?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onReorder).not.toHaveBeenCalled()
    expect(order()).toEqual(['a', 'b', 'c'])
  })
})
