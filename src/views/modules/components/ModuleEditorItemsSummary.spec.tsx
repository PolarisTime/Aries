// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import {
  type ModuleEditorItemsSummaryColumn,
  resolveEditorDraftSummaryValues,
  shouldAttachEditorDraftSummary,
} from './ModuleEditorItemsSummary'

/** antd 表格依赖 ResizeObserver，jsdom 未实现（与其它用例一致地打桩）。 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/**
 * 用例数据刻意让两种口径**不同值**：货物 300.50 / 含附加费用 303.83。
 * 若哪天合计行绕开 `computeDraftTotals` 只把货物行加起来，断言会立刻红
 * （「恰好同值」的数据锁不住口径分叉）。
 */
const twoRows = [
  { id: '1', name: '盘螺', quantity: 2, weightTon: 1.5, amount: 100.5 },
  { id: '2', name: '螺纹钢', quantity: 3, weightTon: 2.25, amount: 200 },
]

const expenseRows = [{ amount: 3.33 }]

const itemColumns = [
  { dataIndex: 'name', title: '商品', key: 'name', width: 200 },
  {
    dataIndex: 'quantity',
    title: '数量',
    key: 'quantity',
    width: 100,
    align: 'center',
  },
  {
    dataIndex: 'weightTon',
    title: '重量(吨)',
    key: 'weightTon',
    width: 110,
    align: 'center',
  },
  {
    dataIndex: 'amount',
    title: '金额',
    key: 'amount',
    width: 120,
    align: 'center',
  },
] as unknown as ModuleEditorItemsSummaryColumn[]

const config = {
  key: 'sales-order',
  itemColumns,
} as unknown as ModulePageConfig

describe('resolveEditorDraftSummaryValues 复用 computeDraftTotals 口径', () => {
  it('金额 = 货物小计 + 附加费用，重量与件数按明细求和', () => {
    const values = resolveEditorDraftSummaryValues('sales-order', twoRows, 3.33)

    expect(values).toEqual({
      rowCount: 2,
      totalCount: 5,
      totalWeight: 3.75,
      // 300.50（货物） + 3.33（附加费用），不是 300.5 —— 口径分叉在这里必须看得出
      totalAmount: 303.83,
      hasComputedTotals: true,
    })
  })

  it('未注册金额计算口径的模块不展示金额/重量合计（不写 0 冒充）', () => {
    const values = resolveEditorDraftSummaryValues(
      'freight-bill',
      twoRows,
      3.33,
    )

    expect(values.rowCount).toBe(2)
    expect(values.totalCount).toBe(5)
    expect(values.hasComputedTotals).toBe(false)
  })

  it('空草稿返回全 0，不抛错', () => {
    const values = resolveEditorDraftSummaryValues('sales-order', [], 0)

    expect(values).toEqual({
      rowCount: 0,
      totalCount: 0,
      totalWeight: 0,
      totalAmount: 0,
      hasComputedTotals: true,
    })
  })
})

describe('shouldAttachEditorDraftSummary', () => {
  it('只在单分组且有可见列时挂合计行', () => {
    expect(shouldAttachEditorDraftSummary(1, 4)).toBe(true)
    // 多分组：antd 会把同一份 summary 传给每个分组表，整单合计会重复
    expect(shouldAttachEditorDraftSummary(2, 4)).toBe(false)
    // 没有列时挂上去只会渲染一条空的 tfoot 行
    expect(shouldAttachEditorDraftSummary(1, 0)).toBe(false)
  })
})

interface MountedSection {
  container: HTMLDivElement
  root: Root
  render: (items: Array<Record<string, unknown>>) => void
}

describe('编辑器明细表底部的草稿合计行', () => {
  let mounted: MountedSection | undefined

  const capabilities = {
    addManualItems: false,
    importParentItems: false,
    autoSortItems: false,
    save: true,
    audit: true,
  }

  function renderSection(
    items: Array<Record<string, unknown>>,
    expenseItems: Array<Record<string, unknown>> = expenseRows,
  ) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const render = (nextItems: Array<Record<string, unknown>>) =>
      act(() => {
        root.render(
          createElement(ModuleEditorItemsSection, {
            config,
            items: nextItems,
            expenseItems,
            expenseSelectedItemIds: [],
            expenseMaterialOptions: [],
            expenseMaterialSearch: {
              searching: false,
              onSearch: () => {},
              onClose: () => {},
            },
            supportsExpenseTab: false,
            selectedItemIds: [],
            parentImportVisible: false,
            parentImporting: false,
            parentSelectorDisplayFieldKey: undefined,
            parentSelectorFilters: undefined,
            parentSelectorModuleKey: undefined,
            parentSelectorOpen: false,
            itemColumns,
            itemTableComponents: undefined,
            itemColumnOrder: [],
            itemRowMenus: undefined,
            visibleItemColumnKeys: [],
            capabilities,
            auditLabel: '审核',
            saving: false,
            showFooterActions: false,
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
            onCancel: () => {},
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
    render(items)
    return { container, root, render }
  }

  /** 合计行的那句文字（tfoot 里只有一个跨列单元格）。 */
  function summaryText(container: HTMLElement) {
    return (
      container.querySelector('.module-editor-summary-text')?.textContent ?? ''
    )
  }

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
  })

  afterEach(() => {
    if (mounted) {
      act(() => mounted?.root.unmount())
      mounted.container.remove()
      mounted = undefined
    }
  })

  it('合计渲染成一段文字：行数 / 数量 / 重量 / 金额（含附加费用口径）', () => {
    mounted = renderSection(twoRows)

    const text = summaryText(mounted.container)
    expect(text).toContain('合计 2 行')
    expect(text).toContain('数量 5')
    expect(text).toContain('3.750')
    expect(text).toContain('303.83')
    // 有附加费用时说清口径：金额是「货物 + 附加费用」
    expect(text).toContain('含附加费用合计')
    // 只占一个跨列单元格，不再逐列铺开
    expect(mounted.container.querySelectorAll('tfoot td')).toHaveLength(1)
  })

  it('草稿行变化后合计实时更新（同一条 React 状态链路，不另建 store）', () => {
    mounted = renderSection(twoRows)
    expect(summaryText(mounted.container)).toContain('合计 2 行')

    mounted.render([
      ...twoRows,
      { id: '3', name: '圆钢', quantity: 1, weightTon: 0.5, amount: 50 },
    ])

    // 行数 +1、数量 +1、重量 +0.5、金额 +50（含附加费用口径不变）
    const text = summaryText(mounted.container)
    expect(text).toContain('合计 3 行')
    expect(text).toContain('数量 6')
    expect(text).toContain('4.250')
    expect(text).toContain('353.83')
  })

  it('没有附加费用时只说「金额」，不提含费用口径', () => {
    mounted = renderSection(twoRows, [])

    const text = summaryText(mounted.container)
    expect(text).toContain('合计 2 行')
    expect(text).toContain('300.50')
    expect(text).not.toContain('含附加费用合计')
  })

  it('没有明细行时整行不渲染（空表交给 antd 空态）', () => {
    mounted = renderSection([])

    expect(summaryText(mounted.container)).toBe('')
    expect(mounted.container.querySelectorAll('tfoot td')).toHaveLength(0)
  })
})
