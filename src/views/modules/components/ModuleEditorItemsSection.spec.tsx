// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'

/** antd 的表格/页签依赖 ResizeObserver，jsdom 未实现（与其它用例一致地打桩）。 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// 让 React 19 认可以 act(...) 包裹的渲染/事件，否则每次断言都会刷警告
;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/**
 * 「取消 / 保存 / 保存并审核」必须出现在**明细工具栏**，且切到「附加费用」页签也不消失。
 *
 * <p>这是 C-3 回归的正面锁定：按钮曾被挪到弹层 footer；改回工具栏后，风险是「工具栏只挂在
 * 货物明细页签」的 P1 复活（切到附加费用就整条工具栏卸载、保存入口消失）。
 * 因此这里断言的是**两个页签都渲染同一份保存组**，而不只是「按钮存在」。</p>
 */
const config = {
  key: 'sales-order',
  itemColumns: [{ dataIndex: 'name', title: '商品' }],
} as unknown as ModulePageConfig

const capabilities = {
  addManualItems: false,
  importParentItems: false,
  autoSortItems: false,
  save: true,
  audit: true,
}

function renderSection(onCancel: () => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(ModuleEditorItemsSection, {
        config,
        items: [],
        expenseItems: [],
        expenseSelectedItemIds: [],
        expenseMaterialOptions: [],
        expenseMaterialSearch: {
          searching: false,
          onSearch: () => {},
          onClose: () => {},
        },
        supportsExpenseTab: true,
        selectedItemIds: [],
        parentImportVisible: false,
        parentImporting: false,
        parentSelectorDisplayFieldKey: undefined,
        parentSelectorFilters: undefined,
        parentSelectorModuleKey: undefined,
        parentSelectorOpen: false,
        itemColumns: [],
        itemTableComponents: undefined,
        itemColumnOrder: [],
        itemRowMenus: undefined,
        visibleItemColumnKeys: [],
        capabilities,
        auditLabel: '审核',
        saving: false,
        showFooterActions: true,
        onAddItem: () => {},
        onAutoSortItems: () => {},
        onExpenseSelectedChange: () => {},
        onExpenseSelectAll: () => {},
        onExpenseChange: () => {},
        onCreateExpense: () => Promise.resolve(undefined),
        onExpenseAddItem: () => {},
        onExpenseDelete: () => {},
        onExpenseReorder: () => {},
        expenseRowKeys: [],
        onCancel,
        onSave: () => {},
        onOpenParentSelector: () => {},
        onCloseParentSelector: () => {},
        onRemoveSelectedItems: () => {},
        onImportParentRecord: () => {},
        onItemColumnOrderChange: () => {},
        onToggleItemColumn: () => {},
      } as never),
    )
  })
  return { container, root }
}

function findExpenseTab(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[role="tab"]')).find((tab) =>
    tab.textContent?.includes('附加费用'),
  ) as HTMLElement | undefined
}

function saveButtonCount(container: HTMLElement) {
  return Array.from(container.querySelectorAll('button')).filter((button) =>
    /保存/.test(button.textContent ?? ''),
  ).length
}

describe('明细工具栏的保存入口落点', () => {
  let mounted: { container: HTMLDivElement; root: Root } | undefined

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    // antd 的响应式断点会在渲染时调 matchMedia，jsdom 没有实现
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
  })

  afterEach(() => {
    if (mounted) {
      act(() => mounted?.root.unmount())
      mounted.container.remove()
      mounted = undefined
    }
  })

  it('货物明细页签在工具栏渲染保存组', () => {
    mounted = renderSection(() => {})
    expect(saveButtonCount(mounted.container)).toBeGreaterThan(0)
  })

  /**
   * 关键回归：切到「附加费用」后保存入口必须仍在。
   * 若哪天又把工具栏塞回货物页签内部，这条会立刻红。
   */
  it('切到附加费用页签后保存入口仍在', () => {
    let cancelled = 0
    mounted = renderSection(() => {
      cancelled += 1
    })
    const tab = findExpenseTab(mounted.container)
    expect(tab).toBeDefined()
    act(() => tab?.click())

    expect(saveButtonCount(mounted.container)).toBeGreaterThan(0)

    const cancelButton = Array.from(
      mounted.container.querySelectorAll('button'),
    ).find((button) => /取消/.test(button.textContent ?? ''))
    expect(cancelButton).toBeDefined()
    act(() => (cancelButton as HTMLButtonElement).click())
    expect(cancelled).toBe(1)
  })
})
