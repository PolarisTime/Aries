// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'
import type { ModuleDetailSummaryColumn } from './ModuleDetailSummaryRow'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import {
  buildEditorDraftSummaryCells,
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
] as unknown as ModuleDetailSummaryColumn[]

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

describe('buildEditorDraftSummaryCells 逐列对齐', () => {
  const values = resolveEditorDraftSummaryValues('sales-order', twoRows, 3.33)

  it('标签挂在第一个真实数据列，数值列各自带上自己的 dataIndex', () => {
    const cells = buildEditorDraftSummaryCells(
      itemColumns,
      values,
      '合计（2 行）',
    )

    expect(cells.map((cell) => cell.dataIndex)).toEqual([
      'name',
      'quantity',
      'weightTon',
      'amount',
    ])
    // 短标签居中；数值单元格显式右对齐（编辑器列本身保持居中，不靠列上的数值标记类）
    expect(cells[0].align).toBe('center')
    expect(cells.slice(1).every((cell) => cell.align === 'right')).toBe(true)
  })

  it('选择列（dataIndex 为 id）不会被标签占用', () => {
    const withSelection = [
      { dataIndex: 'id', key: 'selection', width: 48 },
      { dataIndex: 'name', title: '商品', key: 'name' },
      ...itemColumns.slice(1),
    ] as unknown as ModuleDetailSummaryColumn[]

    const cells = buildEditorDraftSummaryCells(
      withSelection,
      values,
      '合计（2 行）',
    )

    expect(cells[0].dataIndex).toBe('name')
  })

  it('列被隐藏时不产出该单元格（否则会被追加到行末、落到错误的列下面）', () => {
    const withoutAmount = itemColumns.filter(
      (column) => column.dataIndex !== 'amount',
    )

    const cells = buildEditorDraftSummaryCells(
      withoutAmount,
      values,
      '合计（2 行）',
    )

    expect(cells.map((cell) => cell.dataIndex)).toEqual([
      'name',
      'quantity',
      'weightTon',
    ])
  })

  it('未注册金额口径的模块只出件数单元格', () => {
    const noTotals = resolveEditorDraftSummaryValues('freight-bill', twoRows)
    const cells = buildEditorDraftSummaryCells(
      itemColumns,
      noTotals,
      '合计（2 行）',
    )

    expect(cells.map((cell) => cell.dataIndex)).toEqual(['name', 'quantity'])
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

  /** tfoot 里每个单元格的文本（按列顺序）。 */
  function footerTexts(container: HTMLElement) {
    return Array.from(container.querySelectorAll('tfoot td')).map(
      (cell) => cell.textContent ?? '',
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

  it('在明细表底部渲染行数 / 件数 / 重量 / 金额', () => {
    mounted = renderSection(twoRows)

    expect(footerTexts(mounted.container)).toEqual([
      '合计（2 行，含附加费用）',
      '5',
      '3.750',
      '303.83',
    ])
  })

  it('草稿行变化后合计实时更新（同一条 React 状态链路，不另建 store）', () => {
    mounted = renderSection(twoRows)
    expect(footerTexts(mounted.container)[0]).toBe('合计（2 行，含附加费用）')

    mounted.render([
      ...twoRows,
      { id: '3', name: '圆钢', quantity: 1, weightTon: 0.5, amount: 50 },
    ])

    // 行数 +1、件数 +1、重量 +0.5、金额 +50（含附加费用口径不变）
    expect(footerTexts(mounted.container)).toEqual([
      '合计（3 行，含附加费用）',
      '6',
      '4.250',
      '353.83',
    ])
  })

  it('没有附加费用时标签不提「含附加费用」', () => {
    mounted = renderSection(twoRows, [])

    expect(footerTexts(mounted.container)[0]).toBe('合计（2 行）')
    expect(footerTexts(mounted.container)[3]).toBe('300.50')
  })
})
