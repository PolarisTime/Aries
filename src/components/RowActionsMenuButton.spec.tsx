// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { RowActionsMenuButton } from './RowActionsMenuButton'
import {
  RowContextMenuContext,
  type RowContextMenuMap,
} from './row-context-menu'

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

describe('RowActionsMenuButton 行尾可见「更多」按钮', () => {
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

  const render = (menus: RowContextMenuMap, rowKey = '1') => {
    act(() => {
      root.render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          <RowContextMenuContext.Provider value={menus}>
            <RowActionsMenuButton rowKey={rowKey} />
          </RowContextMenuContext.Provider>
        </ConfigProvider>,
      )
    })
  }

  const menusWith = (onView: () => void): RowContextMenuMap =>
    new Map([
      [
        '1',
        {
          ariaLabel: '「PO-1」行操作菜单',
          items: [{ key: 'view', label: '查看明细' }],
          onClick: ({ key }) => {
            if (key === 'view') onView()
          },
        },
      ],
    ])

  const button = () =>
    container.querySelector<HTMLButtonElement>('.table-row-actions-btn')
  const visibleItems = () =>
    document.querySelectorAll(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu .ant-dropdown-menu-item',
    )

  it('渲染带可访问名的菜单触发器按钮', () => {
    render(menusWith(() => {}))
    expect(button()).not.toBeNull()
    expect(button()?.getAttribute('aria-label')).toBe('行操作')
    expect(button()?.getAttribute('aria-haspopup')).toBe('menu')
  })

  it('点击按钮打开该行的菜单(可访问名与行右键一致)', async () => {
    render(menusWith(() => {}))
    act(() => {
      button()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    const menu = document.querySelector(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu [role="menu"]',
    )
    expect(menu?.getAttribute('aria-label')).toBe('「PO-1」行操作菜单')
    expect(visibleItems()).toHaveLength(1)
  })

  it('菜单项点击执行该行动作', async () => {
    const onView = vi.fn()
    render(menusWith(onView))
    act(() => {
      button()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

  it('该行没有可用动作时不渲染按钮(避免空菜单)', () => {
    render(new Map(), 'missing')
    expect(button()).toBeNull()
  })
})
