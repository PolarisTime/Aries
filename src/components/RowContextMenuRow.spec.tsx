// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  ROW_CONTEXT_MENU_LONG_PRESS_MOVE_TOLERANCE_PX,
  ROW_CONTEXT_MENU_LONG_PRESS_MS,
  RowContextMenuRow,
} from './RowContextMenuRow'
import {
  RowContextMenuContext,
  type RowContextMenuMap,
} from './row-context-menu'

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

describe('RowContextMenuRow 行右键菜单容器', () => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await flush()
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    document.querySelectorAll('.ant-dropdown').forEach((node) => {
      node.remove()
    })
  })

  const render = (key: string, menus: RowContextMenuMap) => {
    act(() => {
      root.render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          <RowContextMenuContext.Provider value={menus}>
            <table>
              <tbody>
                <RowContextMenuRow data-row-key={key} tabIndex={0}>
                  <td>
                    <span className="cell-text">单元格</span>
                    <input className="cell-input" aria-label="数量" />
                  </td>
                </RowContextMenuRow>
              </tbody>
            </table>
          </RowContextMenuContext.Provider>
        </ConfigProvider>,
      )
    })
  }

  /** jsdom 没有 TouchEvent, 用带 touches 的普通事件驱动 React 的 onTouch* 合成事件。 */
  const touchEvent = (
    type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
    point?: { x: number; y: number },
  ) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'touches', {
      value: point ? [{ clientX: point.x, clientY: point.y }] : [],
    })
    return event
  }

  const row = () => container.querySelector('tr') as HTMLTableRowElement

  const menuOf = (
    onClick: () => void,
    keyed: string,
    onOpen?: () => void,
  ): RowContextMenuMap =>
    new Map([
      [
        keyed,
        {
          ariaLabel: '「PO-1」行操作菜单',
          items: [{ key: 'view', label: '查看明细' }],
          ...(onOpen ? { onOpen } : {}),
          onClick: ({ key }) => {
            if (key === 'view') onClick()
          },
        },
      ],
    ])

  const visibleItems = () =>
    document.querySelectorAll(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu .ant-dropdown-menu-item',
    )

  it('右键行内文本区域打开菜单, 带可访问名且焦点进首项', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      container
        .querySelector('.cell-text')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
    const menu = document.querySelector(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu [role="menu"]',
    )
    expect(menu?.getAttribute('aria-label')).toBe('「PO-1」行操作菜单')
    expect(visibleItems()[0]).toBe(document.activeElement)
  })

  it('打开行菜单时触发 config.onOpen(用于同步选中态)', async () => {
    const onOpen = vi.fn()
    render(
      '1',
      menuOf(() => {}, '1', onOpen),
    )
    act(() => {
      container
        .querySelector('.cell-text')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
    expect(visibleItems().length).toBeGreaterThan(0)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('点击菜单项把 key 交给行菜单的回调', async () => {
    const onView = vi.fn()
    render('1', menuOf(onView, '1'))
    act(() => {
      container
        .querySelector('.cell-text')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
    await act(async () => {
      visibleItems()[0]?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    expect(onView).toHaveBeenCalledTimes(1)
  })

  it('行可聚焦(tabIndex=0)且 Shift+F10 打开同一份菜单', async () => {
    const onOpen = vi.fn()
    render(
      '1',
      menuOf(() => {}, '1', onOpen),
    )
    expect(row().getAttribute('tabindex')).toBe('0')
    expect(row().getAttribute('aria-keyshortcuts')).toContain('Shift+F10')

    act(() => {
      row().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await flush()
    expect(visibleItems().length).toBeGreaterThan(0)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('上下文菜单键(ContextMenu)打开同一份菜单', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      row().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ContextMenu',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await flush()
    expect(visibleItems().length).toBeGreaterThan(0)
  })

  it('长按 600ms 打开行菜单(触摸兜底)', async () => {
    const onOpen = vi.fn()
    render(
      '1',
      menuOf(() => {}, '1', onOpen),
    )
    act(() => {
      row().dispatchEvent(touchEvent('touchstart', { x: 10, y: 10 }))
    })
    await flush()
    expect(visibleItems()).toHaveLength(0)

    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_CONTEXT_MENU_LONG_PRESS_MS + 80),
      )
    })
    expect(visibleItems().length).toBeGreaterThan(0)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('长按期间移动超过阈值即取消, 不打开菜单', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      row().dispatchEvent(touchEvent('touchstart', { x: 10, y: 10 }))
      row().dispatchEvent(
        touchEvent('touchmove', {
          x: 10 + ROW_CONTEXT_MENU_LONG_PRESS_MOVE_TOLERANCE_PX + 5,
          y: 10,
        }),
      )
    })
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_CONTEXT_MENU_LONG_PRESS_MS + 80),
      )
    })
    expect(visibleItems()).toHaveLength(0)
  })

  it('长按期间滚动即取消, 不打开菜单', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      row().dispatchEvent(touchEvent('touchstart', { x: 10, y: 10 }))
    })
    // 滚动监听只在长按待决期间挂上, 先让 effect 落地
    // (真实浏览器里 touchstart 与随后的 scroll 本来就不在同一帧)
    await flush()
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_CONTEXT_MENU_LONG_PRESS_MS + 80),
      )
    })
    expect(visibleItems()).toHaveLength(0)
  })

  it('长按未到 600ms 就抬手即取消, 不打开菜单', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      row().dispatchEvent(touchEvent('touchstart', { x: 10, y: 10 }))
      row().dispatchEvent(touchEvent('touchend'))
    })
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_CONTEXT_MENU_LONG_PRESS_MS + 80),
      )
    })
    expect(visibleItems()).toHaveLength(0)
  })

  it('输入控件上的长按保留原生长按行为', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      container
        .querySelector('.cell-input')
        ?.dispatchEvent(touchEvent('touchstart', { x: 10, y: 10 }))
    })
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ROW_CONTEXT_MENU_LONG_PRESS_MS + 80),
      )
    })
    expect(visibleItems()).toHaveLength(0)
  })

  it('输入控件上的右键完全放行, 不打开行菜单', async () => {
    render(
      '1',
      menuOf(() => {}, '1'),
    )
    act(() => {
      container
        .querySelector('.cell-input')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
    expect(visibleItems()).toHaveLength(0)
  })

  it('没有菜单配置的行按普通 tr 渲染(不挂触发器)', async () => {
    render(
      'missing',
      menuOf(() => {}, '1'),
    )
    act(() => {
      container
        .querySelector('.cell-text')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
    expect(visibleItems()).toHaveLength(0)
    expect(container.querySelector('tr')?.tagName).toBe('TR')
  })
})
