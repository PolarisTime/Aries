// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ContextMenu } from './ContextMenu'

function menuItems() {
  return [
    { key: 'a', label: '第一项' },
    { key: 'disabled', label: '禁用项', disabled: true },
    { key: 'b', label: '第二项' },
  ]
}

/** 等 antd 弹层挂载 + rAF 里的焦点迁移落地。 */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

describe('ContextMenu 无障碍契约', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
    document.querySelectorAll('.ant-dropdown').forEach((el) => {
      el.remove()
    })
  })

  /** 触发器由本助手以子节点传入, 因此 props 里显式排除 children。 */
  const render = (
    props: Partial<Omit<Parameters<typeof ContextMenu>[0], 'children'>> = {},
  ) => {
    const onClick = vi.fn()
    act(() => {
      root.render(
        // 关掉动效: 关闭动画会把弹层卸载推迟到后续帧, 断言需要确定性
        <ConfigProvider theme={{ token: { motion: false } }}>
          <ContextMenu
            ariaLabel="「首页」标签操作菜单"
            items={menuItems()}
            onClick={onClick}
            {...props}
          >
            <span className="trigger">首页</span>
          </ContextMenu>
        </ConfigProvider>,
      )
    })
    return onClick
  }

  const openByContextMenu = async () => {
    const trigger = container.querySelector('.trigger')
    act(() => {
      trigger?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await flush()
  }

  it('右键打开后菜单带可访问名, 且角色为 menu', async () => {
    render()
    await openByContextMenu()
    const menu = document.querySelector('.ant-dropdown-menu')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('role')).toBe('menu')
    expect(menu?.getAttribute('aria-label')).toBe('「首页」标签操作菜单')
  })

  it('打开后焦点进入第一个可用菜单项(跳过禁用项)', async () => {
    render()
    await openByContextMenu()
    const items = [
      ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ]
    expect(items).toHaveLength(3)
    expect(document.activeElement).toBe(items[0])
    expect(items[1].getAttribute('aria-disabled')).toBe('true')
  })

  /** antd 关闭后把弹层置为 ant-dropdown-hidden(保留 DOM), 这里轮询到隐藏为止。 */
  const waitForMenuClosed = async () => {
    for (let i = 0; i < 20; i += 1) {
      if (isMenuHidden()) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    }
  }

  const isMenuHidden = () =>
    !document.querySelector('.ant-dropdown-menu') ||
    Boolean(document.querySelector('.ant-dropdown-hidden'))

  it('Escape 关闭菜单并把焦点归还给打开它的元素', async () => {
    render()
    const trigger = container.querySelector<HTMLElement>('.trigger')
    // 模拟"调用上下文": 键盘唤起前焦点在触发器所在的可聚焦祖先上
    const button = document.createElement('button')
    button.className = 'tab-button'
    button.textContent = '首页'
    document.body.appendChild(button)
    button.focus()
    expect(document.activeElement).toBe(button)

    await openByContextMenu()
    expect(document.activeElement).not.toBe(button)

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await waitForMenuClosed()
    expect(isMenuHidden()).toBe(true)
    expect(document.activeElement).toBe(button)
    expect(trigger).not.toBeNull()
    button.remove()
  })

  it('点击菜单项把 key 交给调用方', async () => {
    const onClick = render()
    await openByContextMenu()
    const second = [
      ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ][2]
    act(() => {
      second.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(onClick).toHaveBeenCalled()
    expect(onClick.mock.calls[0]?.[0]?.key).toBe('b')
  })

  it('受控打开时可由外部(键盘)唤起同一菜单', async () => {
    render({ open: true })
    await flush()
    expect(document.querySelector('.ant-dropdown-menu')).not.toBeNull()
    expect(document.activeElement).toBe(
      document.querySelector('.ant-dropdown-menu-item'),
    )
  })

  it('父组件抢走焦点后会把焦点送回菜单项, 但不打断菜单内的方向键移动', async () => {
    render()
    await openByContextMenu()
    const items = [
      ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ]
    expect(document.activeElement).toBe(items[0])

    // 模拟 antd Tabs 一类父组件在菜单打开后把焦点抢回调用上下文
    const outside = document.createElement('button')
    outside.className = 'outside-stealer'
    document.body.appendChild(outside)
    act(() => {
      outside.focus()
    })
    expect(document.activeElement).toBe(outside)
    await flush()
    expect(document.activeElement).toBe(items[0])

    // 用户按方向键在菜单内移动时, 看门狗不得把焦点抢回第一项
    act(() => {
      items[2].focus()
    })
    await flush()
    expect(document.activeElement).toBe(items[2])
    outside.remove()
  })
})
