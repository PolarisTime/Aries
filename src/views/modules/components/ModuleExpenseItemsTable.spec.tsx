// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import { ModuleExpenseItemsTable } from './ModuleExpenseItemsTable'

const materialSearch: MaterialSearchController = {
  searching: false,
  onSearch: () => {},
  onClose: () => {},
}

const items: DocumentChargeItemDraft[] = [
  { id: '11', chargeName: '运输费', amount: 100 },
  { id: '12', chargeName: '吊装费', amount: 200 },
]

/**
 * 附加费用明细(div 网格)的行序契约。
 *
 * <p>此前这里的「#」格上摆着一个 `HolderOutlined` 抓手图标, 但**没有任何拖动实现** ——
 * 是个骗点击的假手柄。改成整行长按拖动后必须证明: 假手柄已移除、键盘 Alt+↑↓ 可调序、
 * 回调给出的是**稳定的行 key 顺序**(草稿行没有业务 id, 用下标当 key 会导致重排后身份错位)。</p>
 */
describe('附加费用明细行序', () => {
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

  const render = (options: { onReorder?: (keys: string[]) => void } = {}) => {
    const props = {
      expenseItems: items,
      rowKeys: ['11', '12'],
      materialOptions: [],
      materialSearch,
      selectedItemIds: [] as string[],
      onSelectedChange: vi.fn(),
      onSelectAll: vi.fn(),
      onChange: vi.fn(),
      onCreateExpense: vi.fn(),
      onDelete: vi.fn(),
      ...(options.onReorder ? { onReorder: options.onReorder } : {}),
    }
    act(() => {
      root.render(createElement(ModuleExpenseItemsTable, props))
    })
    return props
  }

  const rows = () =>
    Array.from(container.querySelectorAll<HTMLElement>('.row-drag-sort-row'))

  it('序号列不再有假拖动手柄(整行长按即可拖动)', () => {
    render({ onReorder: vi.fn() })
    expect(container.querySelector('.anticon-holder')).toBeNull()
    // 行本身是拖动行(共享能力挂上的类名)
    expect(rows()).toHaveLength(2)
  })

  it('Alt+↓ 把首行下移一位: 回调新的行 key 顺序并播报', () => {
    const onReorder = vi.fn()
    render({ onReorder })

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

    expect(onReorder).toHaveBeenCalledWith(['12', '11'])
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      '第 1 行已移动到第 2 位',
    )
    // 焦点保持在被移动的那一行
    expect(document.activeElement).toBe(rows()[0])
  })

  it('未提供 onReorder(如保存中)时不挂拖动行', () => {
    render()
    expect(rows()).toHaveLength(0)
  })
})
