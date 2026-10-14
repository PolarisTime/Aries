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
          groups: groups as never,
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

  it('键盘 Alt+↓ 回调新的 id 顺序(与拖动等价, 保存按该顺序下发)', async () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)

    const first = rows()[0]
    act(() => first.focus())
    await act(async () => {
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

  /** 每行的替代按钮: 去掉顺序列后本组用例立即变红。 */
  const moveButton = (rowKey: string, label: string) =>
    Array.from(
      container
        .querySelector<HTMLTableRowElement>(`tr[data-row-key="${rowKey}"]`)
        ?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => (button.getAttribute('aria-label') ?? '').startsWith(label))

  it('每行都有可点击的上移/下移按钮(单指针非拖动替代)', () => {
    render(vi.fn())
    for (const [index, key] of ['a', 'b', 'c'].entries()) {
      const up = moveButton(key, '上移')
      const down = moveButton(key, '下移')
      expect(up, `第 ${index + 1} 行上移`).toBeDefined()
      expect(down, `第 ${index + 1} 行下移`).toBeDefined()
      // 首/末项按边界 aria-disabled, 其余可点
      expect(up?.getAttribute('aria-disabled')).toBe(index === 0 ? 'true' : 'false')
      expect(down?.getAttribute('aria-disabled')).toBe(
        index === 2 ? 'true' : 'false',
      )
      expect(up?.style.minWidth).toBe('24px')
      expect(up?.style.minHeight).toBe('24px')
    }
  })

  it('仅单指针: 点击「下移」按钮完成一次重排', async () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)

    await act(async () => {
      moveButton('a', '下移')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(onItemsReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  it('仅键盘: 聚焦「上移」按钮按回车完成一次重排', async () => {
    const onItemsReorder = vi.fn()
    render(onItemsReorder)
    const up = moveButton('c', '上移')
    act(() => up?.focus())

    await act(async () => {
      up?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      up?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onItemsReorder).toHaveBeenCalledWith(['a', 'c', 'b'])
  })

  it('只读(不传 onItemsReorder)时不渲染替代按钮: 行序本来就不允许改', () => {
    render()
    expect(moveButton('a', '上移')).toBeUndefined()
  })
})
