// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import {
  COLUMN_RESIZE_HANDLE_CLASS,
  ColumnResizeHandle,
  type ColumnResizeHandleProps,
} from './supplier-quote-column-resize'
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from './supplier-quote-column-widths'

/** 契约里写定的类名：`price-compare.css` 的命中区样式按这个字面量编写。 */
const HANDLE_CLASS = 'supplier-price-col-resize'

const LABEL = '中天 直条 12m'

describe('ColumnResizeHandle 列宽把手', () => {
  let container: HTMLDivElement
  let root: Root
  let unmounted: boolean
  let resized: number[]
  let resetCount: number

  const unmountRoot = () => {
    if (unmounted) return
    unmounted = true
    act(() => root.unmount())
  }

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    unmounted = false
    resized = []
    resetCount = 0
  })

  afterEach(() => {
    unmountRoot()
    container.remove()
  })

  const renderHandle = (overrides: Partial<ColumnResizeHandleProps> = {}) => {
    act(() => {
      root.render(
        createElement(ColumnResizeHandle, {
          label: LABEL,
          width: 64,
          onResize: (next: number) => {
            resized.push(next)
          },
          onReset: () => {
            resetCount += 1
          },
          ...overrides,
        }),
      )
    })
    const handle = container.querySelector<HTMLElement>(`.${HANDLE_CLASS}`)
    expect(handle).not.toBeNull()
    return handle as HTMLElement
  }

  const dispatchPointer = (
    target: EventTarget,
    type: string,
    clientX: number,
    init: MouseEventInit = {},
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      ...init,
    })
    act(() => {
      target.dispatchEvent(event)
    })
    return event
  }

  const dispatchKey = (target: EventTarget, key: string) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      target.dispatchEvent(event)
    })
    return event
  }

  it('类名稳定：CSS 命中区按这个字面量编写', () => {
    expect(COLUMN_RESIZE_HANDLE_CLASS).toBe(HANDLE_CLASS)
    expect(renderHandle().className).toBe(HANDLE_CLASS)
  })

  it('可聚焦的竖直 separator：ARIA 数值与可访问名跟随当前宽度', () => {
    const handle = renderHandle()

    expect(handle.getAttribute('role')).toBe('separator')
    expect(handle.getAttribute('aria-orientation')).toBe('vertical')
    expect(handle.tabIndex).toBe(0)
    expect(handle.getAttribute('aria-valuemin')).toBe(String(MIN_COLUMN_WIDTH))
    expect(handle.getAttribute('aria-valuemax')).toBe(String(MAX_COLUMN_WIDTH))
    expect(handle.getAttribute('aria-valuenow')).toBe('64')
    expect(handle.getAttribute('aria-valuetext')).toBe('64px')
    expect(handle.getAttribute('aria-label')).toBe(
      i18n.t('priceCompare.supplierPrice.resizeColumn', { name: LABEL }),
    )
    // title 把"不拖动的替代路径"告诉鼠标用户（WCAG 2.2 SC 2.5.7）。
    expect(handle.getAttribute('title')).toBe(
      i18n.t('priceCompare.supplierPrice.resizeColumnHint'),
    )

    // 宽度变了（拖动 / 键盘 / 记忆恢复）后无障碍数值必须跟着变，不能停在首帧。
    renderHandle({ width: 96 })
    const updated = container.querySelector<HTMLElement>(`.${HANDLE_CLASS}`)
    expect(updated?.getAttribute('aria-valuenow')).toBe('96')
    expect(updated?.getAttribute('aria-valuetext')).toBe('96px')
  })

  it('宽度越界时按上下限夹住后上报（非法 aria 值不进无障碍树）', () => {
    const handle = renderHandle({ width: 9999 })
    expect(handle.getAttribute('aria-valuenow')).toBe(String(MAX_COLUMN_WIDTH))
  })

  it('方向键按一步 8px 调整列宽，并阻止默认行为', () => {
    const handle = renderHandle()

    const right = dispatchKey(handle, 'ArrowRight')
    expect(resized).toEqual([64 + 8])
    expect(right.defaultPrevented).toBe(true)

    const left = dispatchKey(handle, 'ArrowLeft')
    expect(resized).toEqual([64 + 8, 64 - 8])
    expect(left.defaultPrevented).toBe(true)
  })

  it('宽度到上下限时夹住（316 + 8 → 320，52 - 8 → 48）', () => {
    const upper = renderHandle({ width: 316 })
    dispatchKey(upper, 'ArrowRight')
    expect(resized).toEqual([MAX_COLUMN_WIDTH])

    resized = []
    const lower = renderHandle({ width: 52 })
    dispatchKey(lower, 'ArrowLeft')
    expect(resized).toEqual([MIN_COLUMN_WIDTH])
  })

  it('step 可覆盖默认步长', () => {
    const handle = renderHandle({ width: 100, step: 16 })
    dispatchKey(handle, 'ArrowRight')
    expect(resized).toEqual([116])
  })

  it('Home 恢复默认宽度（不误触发宽度回调）', () => {
    const handle = renderHandle()
    const event = dispatchKey(handle, 'Home')

    expect(resetCount).toBe(1)
    expect(resized).toEqual([])
    expect(event.defaultPrevented).toBe(true)
  })

  it('双击复位', () => {
    const handle = renderHandle()
    act(() => {
      handle.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
      )
    })
    expect(resetCount).toBe(1)
  })

  it('指针拖动按 clientX 位移调整宽度，松手后不再响应', () => {
    const handle = renderHandle({ width: 64 })

    // 还没按下时移动鼠标不产生任何调整。
    dispatchPointer(window, 'pointermove', 40)
    expect(resized).toEqual([])

    const down = dispatchPointer(handle, 'pointerdown', 100)
    // preventDefault：拖动列宽时不要让浏览器顺带选中文本。
    expect(down.defaultPrevented).toBe(true)

    dispatchPointer(window, 'pointermove', 130)
    expect(resized).toEqual([94])

    // 超出上限的位移同样被夹住。
    dispatchPointer(window, 'pointermove', 1000)
    expect(resized).toEqual([94, MAX_COLUMN_WIDTH])

    dispatchPointer(window, 'pointerup', 1000)
    dispatchPointer(window, 'pointermove', 1200)
    expect(resized).toEqual([94, MAX_COLUMN_WIDTH])
  })

  it('pointercancel 也会收尾（触屏被系统手势抢走时不残留监听）', () => {
    const handle = renderHandle({ width: 64 })
    dispatchPointer(handle, 'pointerdown', 100)
    dispatchPointer(window, 'pointercancel', 120)
    dispatchPointer(window, 'pointermove', 180)
    expect(resized).toEqual([])
  })

  it('只响应左键按下', () => {
    const handle = renderHandle()
    dispatchPointer(handle, 'pointerdown', 100, { button: 2 })
    dispatchPointer(window, 'pointermove', 140)
    expect(resized).toEqual([])
  })

  it('卸载时摘掉 window 上的拖动监听', () => {
    const handle = renderHandle()
    dispatchPointer(handle, 'pointerdown', 100)

    unmountRoot()
    dispatchPointer(window, 'pointermove', 160)
    expect(resized).toEqual([])
  })
})
