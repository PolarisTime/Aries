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
 * <p>只测"接上了没有": 行必须走共享的可排序行、键盘 Alt+↑↓ 必须回调新的 id 顺序。
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

  const rows = () =>
    Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr'))

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
})
