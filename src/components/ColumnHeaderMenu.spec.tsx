// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ColumnHeaderMenu } from './ColumnHeaderMenu'
import { ColumnSettingsRequestContext } from './column-settings-request-context'

/** 等 antd 弹层挂载与焦点迁移落地。 */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

describe('ColumnHeaderMenu 列头右键菜单', () => {
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

  const render = (
    options: {
      isFirst?: boolean
      isLast?: boolean
      withSettings?: boolean
      withExtraItems?: boolean
    } = {},
  ) => {
    const onHide = vi.fn()
    const onMoveFirst = vi.fn()
    const onMoveLast = vi.fn()
    const onRequestSettings = vi.fn()
    const onExtraItem = vi.fn()
    const menu = (
      <ColumnHeaderMenu
        columnTitle="品牌"
        extraItems={
          options.withExtraItems
            ? [
                {
                  key: 'fill-supplier-column',
                  label: '一键填入供应商…',
                },
              ]
            : undefined
        }
        isFirst={options.isFirst ?? false}
        isLast={options.isLast ?? false}
        onExtraItem={onExtraItem}
        onHide={onHide}
        onMoveFirst={onMoveFirst}
        onMoveLast={onMoveLast}
      >
        <span className="column-title">品牌</span>
      </ColumnHeaderMenu>
    )
    act(() => {
      root.render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          {options.withSettings ? (
            <ColumnSettingsRequestContext.Provider value={onRequestSettings}>
              {menu}
            </ColumnSettingsRequestContext.Provider>
          ) : (
            menu
          )}
        </ConfigProvider>,
      )
    })
    return {
      onHide,
      onMoveFirst,
      onMoveLast,
      onRequestSettings,
      onExtraItem,
    }
  }

  /** 列头触发器: 可聚焦的 role="button" 包装节点。 */
  const trigger = () =>
    container.querySelector<HTMLElement>(
      '.column-header-menu-trigger[role="button"]',
    )

  const openMenu = async () => {
    act(() => {
      container
        .querySelector('.column-title')
        ?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        )
    })
    await flush()
  }

  /** 只取当前可见弹层里的项: antd 关闭后保留隐藏 DOM, 跨次打开会查到旧项。 */
  const visibleMenuItems = () => [
    ...document.querySelectorAll<HTMLElement>(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu .ant-dropdown-menu-item',
    ),
  ]
  const menuItems = () =>
    visibleMenuItems().map((node) => ({
      text: (node.textContent || '').trim(),
      disabled: node.getAttribute('aria-disabled') === 'true',
    }))

  const clickItem = async (label: string) => {
    const item = visibleMenuItems().find(
      (node) => (node.textContent || '').trim() === label,
    )
    expect(item).toBeTruthy()
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('右键列头弹出菜单, 带列名可访问名且焦点进入首项', async () => {
    render()
    await openMenu()
    const menu = document.querySelector(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu [role="menu"]',
    )
    expect(menu?.getAttribute('aria-label')).toBe('「品牌」列操作菜单')
    expect(visibleMenuItems()[0]).toBe(document.activeElement)
  })

  it('默认提供 隐藏该列 / 移到最前 / 移到最后, 边界处禁用而不隐藏', async () => {
    render({ isFirst: true, isLast: false })
    await openMenu()
    expect(menuItems()).toEqual([
      { text: '隐藏该列', disabled: false },
      { text: '移到最前', disabled: true },
      { text: '移到最后', disabled: false },
    ])

    render({ isFirst: false, isLast: true })
    await openMenu()
    expect(menuItems()).toEqual([
      { text: '隐藏该列', disabled: false },
      { text: '移到最前', disabled: false },
      { text: '移到最后', disabled: true },
    ])
  })

  it('点击各项调用对应回调: 隐藏 / 移到最前 / 移到最后', async () => {
    const handlers = render()
    await openMenu()
    await clickItem('隐藏该列')
    expect(handlers.onHide).toHaveBeenCalledTimes(1)

    await openMenu()
    await clickItem('移到最前')
    expect(handlers.onMoveFirst).toHaveBeenCalledTimes(1)

    await openMenu()
    await clickItem('移到最后')
    expect(handlers.onMoveLast).toHaveBeenCalledTimes(1)
  })

  it('未提供列设置上下文时不渲染「列设置…」项', async () => {
    render()
    await openMenu()
    expect(menuItems().map((item) => item.text)).not.toContain('列设置…')
  })

  it('提供列设置上下文时渲染「列设置…」并请求打开弹层', async () => {
    const handlers = render({ withSettings: true })
    await openMenu()
    expect(menuItems().map((item) => item.text)).toContain('列设置…')
    await clickItem('列设置…')
    expect(handlers.onRequestSettings).toHaveBeenCalledTimes(1)
  })

  it('Escape 关闭菜单并把焦点还给列头触发器', async () => {
    render()
    const node = trigger()
    if (node) node.focus()
    await openMenu()
    expect(document.activeElement).not.toBe(node)

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await flush()
    expect(document.activeElement).toBe(trigger())
  })

  it('触发器可聚焦并带 role/aria 契约(右键不是唯一入口)', () => {
    render()
    const node = trigger()
    expect(node).not.toBeNull()
    expect(node?.tabIndex).toBe(0)
    expect(node?.getAttribute('role')).toBe('button')
    expect(node?.getAttribute('aria-haspopup')).toBe('menu')
    expect(node?.getAttribute('aria-keyshortcuts')).toBe('Shift+F10')
  })

  it('聚焦触发器后 Shift+F10 打开菜单且焦点进入首项', async () => {
    render()
    const node = trigger()
    act(() => {
      node?.focus()
    })
    act(() => {
      node?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await flush()
    expect(visibleMenuItems().length).toBeGreaterThan(0)
    expect(visibleMenuItems()[0]).toBe(document.activeElement)

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await flush()
    expect(document.activeElement).toBe(trigger())
  })

  it('ContextMenu 键等价于 Shift+F10', async () => {
    render()
    const node = trigger()
    act(() => {
      node?.focus()
    })
    act(() => {
      node?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ContextMenu',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await flush()
    expect(visibleMenuItems().length).toBeGreaterThan(0)
  })

  it('extraItems 渲染在「隐藏该列」之前, 非内部 key 交给 onExtraItem', async () => {
    const handlers = render({ withExtraItems: true })
    await openMenu()
    expect(menuItems().map((item) => item.text)).toEqual([
      '一键填入供应商…',
      '隐藏该列',
      '移到最前',
      '移到最后',
    ])

    await clickItem('一键填入供应商…')
    expect(handlers.onExtraItem).toHaveBeenCalledWith('fill-supplier-column')
    expect(handlers.onHide).not.toHaveBeenCalled()
  })
})
