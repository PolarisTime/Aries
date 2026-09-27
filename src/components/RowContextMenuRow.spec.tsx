// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { RowContextMenuRow } from './RowContextMenuRow'
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
                <RowContextMenuRow data-row-key={key}>
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

  const menuOf = (onClick: () => void, keyed: string): RowContextMenuMap =>
    new Map([
      [
        keyed,
        {
          ariaLabel: '「PO-1」行操作菜单',
          items: [{ key: 'view', label: '查看明细' }],
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
