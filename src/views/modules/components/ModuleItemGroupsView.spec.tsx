// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleLineItem } from '@/types/module-page'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'

const items: ModuleLineItem[] = [
  { id: 'a', materialName: '螺纹钢' },
  { id: 'b', materialName: '盘螺' },
  { id: 'c', materialName: '高线' },
] as ModuleLineItem[]

const groups = [
  {
    key: 'all',
    sourceNo: '',
    billTime: '',
    customerName: '',
    projectName: '',
    totalQuantity: 0,
    totalWeightTon: 0,
    items,
  },
]

/**
 * 模块编辑器(销售订单/采购订单等共享链路)的拖动接线契约。
 *
 * <p>只测"接上了没有": 行必须走共享的可排序行、键盘 Alt+↑↓ 必须回调新的 id 顺序,
 * 且**每行都要有可点击的上移/下移按钮**(WCAG 2.2 SC 2.5.7 的非拖动替代)。
 * 拖动激活本身(长按阈值/抖动取消/输入控件放行)由 `@/components/table/row-drag` 的用例覆盖,
 * 这里换成 mock 就测不到"生产链路真的挂了这套行组件"。</p>
 */
describe('模块编辑器明细表拖动接线', () => {
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
    vi.clearAllMocks()
  })

  const render = (onItemsReorder?: (nextIds: string[]) => void) => {
    act(() => {
      root.render(
        createElement(ModuleItemGroupsView, {
          groups: groups,
          moduleKey: 'sales-order',
          columns: [],
          emptyText: '暂无数据',
          ...(onItemsReorder ? { onItemsReorder } : {}),
        }),
      )
    })
  }

  /** 只看真实数据行: antd 在设置了 scroll.x 时会额外渲染一行测量行(无 data-row-key)。 */
  const rows = () =>
    Array.from(
      container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-key]'),
    )

  it('允许排序时行挂上共享的可排序行(整行长按拖动)', () => {
    render(vi.fn())
    const rendered = rows()
    expect(rendered).toHaveLength(3)
    for (const row of rendered) {
      expect(row.classList.contains('row-drag-sort-row')).toBe(true)
    }
  })

  it('不传 onItemsReorder(只读/上游派生)时不挂拖动行, 也不占 Tab 序', () => {
    render()
    const rendered = rows()
    expect(rendered).toHaveLength(3)
    for (const row of rendered) {
      expect(row.classList.contains('row-drag-sort-row')).toBe(false)
      expect(row.getAttribute('aria-keyshortcuts')).toBeNull()
    }
  })

  it('键盘 Alt+↓ 回调新的 id 顺序(与拖动等价, 保存按该顺序下发)', () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)

    const first = rows()[0]
    act(() => first.focus())
    act(() => {
      first.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onItemsReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  /**
   * 行右键菜单里的「上移 / 下移」是**单指针的非拖动替代**（WCAG 2.2 SC 2.5.7）。
   *
   * <p>顺序列从"可点击的 ↑↓ 按钮"改成拖动柄之后，非拖动路径换到了行菜单；这里直接驱动
   * 真实链路：`contextmenu` → antd 菜单渲染到 portal → 点菜单项 → `onItemsReorder`。</p>
   */
  const openRowMenu = async (rowKey: string) => {
    const row = container.querySelector<HTMLTableRowElement>(
      `tr[data-row-key="${rowKey}"]`,
    )
    await act(async () => {
      row?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 40,
          clientY: 40,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const menuItem = (label: string) =>
    Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).find((node) => (node.textContent ?? '').trim().startsWith(label))

  it('行菜单按边界提供「上移 / 下移」', async () => {
    render(vi.fn())

    // 首行：上移置灰、下移可用
    await openRowMenu('a')
    expect(menuItem('上移')?.getAttribute('aria-disabled')).toBe('true')
    expect(menuItem('下移')?.getAttribute('aria-disabled')).toBe('false')
  })

  it('仅单指针: 点行菜单「下移」完成一次重排', async () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)

    await openRowMenu('a')
    await act(async () => {
      menuItem('下移')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(onItemsReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  it('仅键盘: 「上移」菜单项可聚焦并回车触发重排', async () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)

    await openRowMenu('c')
    const up = menuItem('上移')
    expect(up).toBeDefined()
    await act(async () => {
      up?.focus()
      up?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      up?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(onItemsReorder).toHaveBeenCalledWith(['a', 'c', 'b'])
  })

  it('只读(不传 onItemsReorder)时不渲染拖动柄, 菜单也不给上移/下移', async () => {
    render()
    expect(container.querySelectorAll('.module-row-drag-handle')).toHaveLength(
      0,
    )

    await openRowMenu('a')
    expect(menuItem('上移')).toBeUndefined()
    expect(menuItem('下移')).toBeUndefined()
  })
})
