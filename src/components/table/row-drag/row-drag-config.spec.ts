// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
  forwardDragListeners,
  guard,
  isRowDragBlockedTarget,
} from './row-drag-activation'
import {
  ROW_DRAG_KEYBOARD_SHORTCUTS,
  ROW_DRAG_LONG_PRESS_MS,
  ROW_DRAG_MOVE_TOLERANCE_PX,
  rowDragActivationConstraint,
  rowDragAriaKeyshortcuts,
  rowDragKeyboardDelta,
  rowDragKeyboardHintText,
} from './row-drag-config'

/**
 * 长按起拖的**共享口径**契约。
 *
 * <p>取消可见拖动手柄后, 整行即拖动区。这两个数值决定了"会不会误触": 阈值太短,
 * 点在单元格上就被当成拖动; 容差太大, 想滚动列表却起了拖。因此它们必须只有一份定义,
 * 且必须有用例锁住 —— 回退验证: 把 {@link ROW_DRAG_LONG_PRESS_MS} 改成 0、
 * 或把 {@link ROW_DRAG_MOVE_TOLERANCE_PX} 去掉/放大, 本组用例立即变红。</p>
 */
describe('行拖动长按口径', () => {
  it('长按阈值在 350–400ms 区间内(太短会误触, 太长像卡住)', () => {
    expect(ROW_DRAG_LONG_PRESS_MS).toBeGreaterThanOrEqual(350)
    expect(ROW_DRAG_LONG_PRESS_MS).toBeLessThanOrEqual(400)
  })

  it('长按期间的位移容差为 5px 量级: 超过即取消长按(保留滚动与划选)', () => {
    expect(ROW_DRAG_MOVE_TOLERANCE_PX).toBeGreaterThan(0)
    expect(ROW_DRAG_MOVE_TOLERANCE_PX).toBeLessThanOrEqual(8)
  })

  it('传感器激活约束与常量同源(不允许某一处另写一套数值)', () => {
    expect(rowDragActivationConstraint()).toEqual({
      delay: ROW_DRAG_LONG_PRESS_MS,
      tolerance: ROW_DRAG_MOVE_TOLERANCE_PX,
    })
  })
})

/**
 * 键位清单的**单一出口**契约。
 *
 * <p>回退验证: 把清单改回"双套"(再补一个 `Space` 拾起键)时, 下面"只有 Alt+↑/↓ 一套"
 * 与"aria-keyshortcuts 不含 Space"两条立即变红; 把实现里的键位判断改回手写一套(不经过
 * {@link rowDragKeyboardDelta})时, 按键判定用例变红。</p>
 */
describe('行拖动键位清单', () => {
  it('只有 Alt+↑/↓ 一套: 不再有 Space 等第二套拾起键', () => {
    expect(ROW_DRAG_KEYBOARD_SHORTCUTS).toHaveLength(2)
    expect(
      ROW_DRAG_KEYBOARD_SHORTCUTS.map((entry) => entry.ariaKeyshortcuts),
    ).toEqual(['Alt+ArrowUp', 'Alt+ArrowDown'])
  })

  it('aria-keyshortcuts 由清单派生, 并追加调用方原有快捷键', () => {
    expect(rowDragAriaKeyshortcuts()).toBe('Alt+ArrowUp Alt+ArrowDown')
    expect(rowDragAriaKeyshortcuts('Shift+F10')).toBe(
      'Alt+ArrowUp Alt+ArrowDown Shift+F10',
    )
    expect(rowDragAriaKeyshortcuts()).not.toContain('Space')
  })

  it('提示文案与清单同源: 逐个列出清单里的键位写法', () => {
    const hint = rowDragKeyboardHintText()
    for (const entry of ROW_DRAG_KEYBOARD_SHORTCUTS) {
      expect(hint).toContain(entry.label)
    }
    expect(hint).not.toMatch(/Space|空格/)
  })

  it('按键判定只认清单: Alt+↑/↓ 出增量, 空格与单独方向键不出', () => {
    const base = { ctrlKey: false, metaKey: false, shiftKey: false }
    expect(
      rowDragKeyboardDelta({ ...base, key: 'ArrowUp', altKey: true }),
    ).toBe(-1)
    expect(
      rowDragKeyboardDelta({ ...base, key: 'ArrowDown', altKey: true }),
    ).toBe(1)
    // 空格不再拾起拖动: 清单里没有它, 因此这里必须不处理
    expect(rowDragKeyboardDelta({ ...base, key: ' ', altKey: false })).toBe(
      undefined,
    )
    expect(
      rowDragKeyboardDelta({ ...base, key: 'ArrowDown', altKey: false }),
    ).toBe(undefined)
    expect(
      rowDragKeyboardDelta({
        ...base,
        key: 'ArrowDown',
        altKey: true,
        ctrlKey: true,
      }),
    ).toBe(undefined)
  })
})

describe('行拖动放行判定', () => {
  const target = (html: string) => {
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    return host.firstElementChild as Element
  }

  it('正在编辑的输入/下拉/数字输入上不起拖(不劫持编辑)', () => {
    expect(isRowDragBlockedTarget(target('<input />'))).toBe(true)
    expect(isRowDragBlockedTarget(target('<textarea></textarea>'))).toBe(true)
    expect(
      isRowDragBlockedTarget(target('<div class="ant-select"></div>')),
    ).toBe(true)
    expect(
      isRowDragBlockedTarget(target('<div class="ant-input-number"></div>')),
    ).toBe(true)
  })

  it('行内按钮/链接/选择框上不起拖(点选与右键菜单不能被抢)', () => {
    expect(
      isRowDragBlockedTarget(target('<button type="button">删除</button>')),
    ).toBe(true)
    expect(isRowDragBlockedTarget(target('<a href="/x">打开</a>'))).toBe(true)
    expect(
      isRowDragBlockedTarget(
        target(
          '<label class="ant-checkbox-wrapper"><input type="checkbox" /></label>',
        )?.querySelector('input') ?? null,
      ),
    ).toBe(true)
  })

  it('已禁用的控件不算交互目标: 从它上面起拖不该成为死区', () => {
    expect(
      isRowDragBlockedTarget(
        target('<button type="button" disabled>删除</button>'),
      ),
    ).toBe(false)
    expect(isRowDragBlockedTarget(target('<input disabled />'))).toBe(false)
  })

  it('普通单元格/空目标放行(整行都是拖动区)', () => {
    expect(isRowDragBlockedTarget(target('<td>螺纹钢</td>'))).toBe(false)
    expect(isRowDragBlockedTarget(target('<span>1</span>'))).toBe(false)
    expect(isRowDragBlockedTarget(null)).toBe(false)
  })

  it('guard 只在放行时调用原处理器', () => {
    const handler = vi.fn()
    const guarded = guard(handler)
    const input = target('<input />') as HTMLInputElement
    const cell = target('<td>螺纹钢</td>') as HTMLTableCellElement

    guarded?.({ target: input })
    expect(handler).not.toHaveBeenCalled()
    guarded?.({ target: cell })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('forwardDragListeners 按传感器声明的键整体转发(换传感器不会静默失效)', () => {
    const onMouseDown = vi.fn()
    const onTouchStart = vi.fn()
    const forwarded = forwardDragListeners({ onMouseDown, onTouchStart })
    expect(Object.keys(forwarded).sort()).toEqual([
      'onMouseDown',
      'onTouchStart',
    ])

    const cell = target('<td>螺纹钢</td>') as HTMLTableCellElement
    ;(forwarded.onMouseDown as (event: { target: EventTarget | null }) => void)(
      { target: cell },
    )
    expect(onMouseDown).toHaveBeenCalledTimes(1)

    // 输入控件上整体放行
    const input = target('<input />') as HTMLInputElement
    ;(
      forwarded.onTouchStart as (event: { target: EventTarget | null }) => void
    )({ target: input })
    expect(onTouchStart).not.toHaveBeenCalled()
  })
})
