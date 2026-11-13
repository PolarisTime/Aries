// @vitest-environment jsdom

import { Table, type TableColumnsType } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleDetailSummaryCell } from '@/types/module-page'
import { ModuleDetailSummaryRow } from './ModuleDetailSummaryRow'

/** 数值列标记类：与 `buildDetailItemColumns` 打的是同一个类名（等宽 + 右对齐的唯一样式出口）。 */
const NUMERIC = 'module-detail-table-cell--numeric'

interface Row {
  id: string
  warehouseName?: string
  quantity?: number
  weightTon?: number
  amount?: number
}

/** 仿销售订单详情表：文本列在前、三个数值列在后（数值列带 numeric 标记）。 */
const columns: TableColumnsType<Row> = [
  { title: '仓库名称', dataIndex: 'warehouseName', key: 'warehouseName' },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    className: NUMERIC,
    align: 'center',
  },
  {
    title: '重量(吨)',
    dataIndex: 'weightTon',
    key: 'weightTon',
    className: NUMERIC,
    align: 'center',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    className: NUMERIC,
    align: 'center',
  },
]

const dataSource: Row[] = [
  {
    id: 'r1',
    warehouseName: '升华物流',
    quantity: 5,
    weightTon: 12.5,
    amount: 136180.02,
  },
]

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ModuleDetailSummaryRow', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  /** 把合计行挂进真实 antd 表格的 footer：列槽位与明细表完全同一份。 */
  function renderSummary(
    cells: ModuleDetailSummaryCell[],
    customColumns: TableColumnsType<Row> = columns,
  ) {
    act(() => {
      root.render(
        createElement(Table<Row>, {
          rowKey: 'id',
          columns: customColumns,
          dataSource,
          pagination: false,
          summary: () =>
            createElement(ModuleDetailSummaryRow, {
              columns: customColumns,
              cells,
            }),
        }),
      )
    })
  }

  function footerCells(): HTMLTableCellElement[] {
    return Array.from(
      container.querySelectorAll<HTMLTableCellElement>(
        'tfoot tr.module-detail-summary-row > td',
      ),
    )
  }

  function footerTexts(): string[] {
    return footerCells().map((cell) => cell.textContent ?? '')
  }

  /*
   * 形态：与编辑器「草稿合计」一致 —— **一行文字、右端对齐**。
   * 逐列铺开的合计在十几列的表里会把数字拉散、看起来像多了一行数据。
   * 口径不变：单元格仍由 config.detailSummary 产出，这里只负责排版。
   */
  it('收成一行文字：只有一个跨列单元格，按列名带标签、以 · 连接', () => {
    renderSummary([
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
    ])

    const cells = footerCells()
    expect(cells).toHaveLength(1)
    // 跨满整表宽度，否则文字右端贴不到表格右边界
    expect(cells[0]?.getAttribute('colspan')).toBe(String(columns.length))
    // 顺序按列顺序（数量 → 重量 → 金额），标签取自列名
    expect(cells[0]?.textContent).toBe(
      '数量 5 · 重量(吨) 12.500 · 金额 136180.02',
    )
  })

  it('没有列名标签的单元格（合计行数）排在最前，原样输出', () => {
    renderSummary([
      { key: 'rowCount', dataIndex: '#', value: '合计（1 行）' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
    ])

    expect(footerTexts()).toEqual([
      '合计（1 行） · 数量 5 · 重量(吨) 12.500 · 金额 136180.02',
    ])
  })

  it('dataIndex 匹配不到列的单元格也不会丢（追加到文字末尾）', () => {
    renderSummary([
      { key: 'label', dataIndex: 'warehouseName', value: '合计' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'rowCount', dataIndex: '#', value: '行数 1' },
    ])

    const text = footerCells()[0]?.textContent ?? ''
    expect(text).toContain('仓库名称 合计')
    expect(text).toContain('数量 5')
    // 宁可多一段，也不静默丢掉合计值
    expect(text).toContain('行数 1')
  })

  /*
   * 物流单明细没有「金额」列，但共用的 `buildDefaultLineItemSummary` 仍会产出 amount 合计。
   * 收成一句后它会变成没头没尾的「· 0.00 ·」，必须丢掉；而自带文字标签的
   * 「合计（N 行）」对不上列也要保留。
   */
  it('对不上列且值为纯数字的单元格被丢弃，自带文字标签的保留', () => {
    // 物流单形态：明细列里没有「金额」，但共用的合计仍会产出 amount
    const withoutAmount = columns.filter(
      (column) => (column as { dataIndex?: unknown }).dataIndex !== 'amount',
    )
    renderSummary(
      [
        { key: 'rowCount', dataIndex: '#', value: '合计（1 行）' },
        { key: 'quantity', dataIndex: 'quantity', value: '5' },
        { key: 'amount', dataIndex: 'amount', value: '0.00' },
      ],
      withoutAmount,
    )

    expect(footerTexts()).toEqual(['合计（1 行） · 数量 5'])
  })

  it('没有可用单元格时整行不渲染（空表交给 antd 空态）', () => {
    renderSummary([])
    expect(footerCells()).toHaveLength(0)
  })

  /*
   * 右对齐与等宽数字由 `pages.css` 的 `.module-detail-summary-text` 提供
   * （jsdom 不解析外部样式表，这里锁类名；样式契约见 src/styles 下的 CSS 测试）。
   */
  it('文字块挂在专用的右对齐样式类上', () => {
    renderSummary([{ key: 'quantity', dataIndex: 'quantity', value: '5' }])
    const block = container.querySelector('.module-detail-summary-text')
    expect(block).not.toBeNull()
    expect(block?.className).toContain('module-detail-summary-text')
  })
})
