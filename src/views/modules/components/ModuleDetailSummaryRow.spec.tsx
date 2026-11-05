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
  function renderSummary(cells: ModuleDetailSummaryCell[]) {
    act(() => {
      root.render(
        createElement(Table<Row>, {
          rowKey: 'id',
          columns,
          dataSource,
          pagination: false,
          summary: () =>
            createElement(ModuleDetailSummaryRow, { columns, cells }),
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

  it('按 dataIndex 对齐：数字落在自己的列下，缺数据的列渲染空 td', () => {
    renderSummary([
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
    ])

    // 数量列缺失也不省略 td：合计单元格是按顺序铺的，少一个后面整体左移
    expect(footerTexts()).toEqual(['', '5', '12.500', '136180.02'])
    expect(footerCells()).toHaveLength(columns.length)
  })

  it('dataIndex 匹配不到列的单元格落到最左侧空槽，而不是追加到行末', () => {
    /*
     * 销售订单的真实形态：第一格是 `dataIndex: '#'` 的「行数」，明细表没有序号列。
     * 追加到行末时它落在滚动区外（明细表 `table-layout: fixed` + `scroll.x`），
     * 「合计（N 行）」用户看不到。
     */
    renderSummary([
      { key: 'rowCount', dataIndex: '#', value: '行数 1' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
    ])

    const texts = footerTexts()
    expect(texts).toHaveLength(columns.length)
    // 首格（仓库名称列）显示行数，右侧三个数值仍在各自列下
    expect(texts[0]).toBe('行数 1')
    expect(texts.slice(1)).toEqual(['5', '12.500', '136180.02'])
  })

  it('没配 dataIndex 的单元格按顺序从左往右补空槽', () => {
    renderSummary([{ key: 'label', value: '合计' }])

    expect(footerTexts()).toEqual(['合计', '', '', ''])
  })

  it('空槽填满后仍多余的单元格追加末尾，合计值不被静默丢弃', () => {
    renderSummary([
      { key: 'label', dataIndex: 'warehouseName', value: '合计' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
      { key: 'rowCount', dataIndex: '#', value: '行数 1' },
    ])

    const texts = footerTexts()
    // 四列都占满，多出来的一格只能追加到末尾：宁可多一格，也不丢合计值
    expect(texts).toEqual(['合计', '5', '12.500', '136180.02', '行数 1'])
  })

  it('数值列带 module-detail-table-cell--numeric 并右对齐（合计行 tfoot 拿不到表体的右对齐规则）', () => {
    renderSummary([
      { key: 'label', dataIndex: 'warehouseName', value: '合计' },
      { key: 'quantity', dataIndex: 'quantity', value: '5' },
      { key: 'weightTon', dataIndex: 'weightTon', value: '12.500' },
      { key: 'amount', dataIndex: 'amount', value: '136180.02' },
    ])

    const cells = footerCells()
    // 文本列不挂数值标记，避免等宽字体把仓库名也变成等宽
    expect(cells[0]?.className).not.toContain(NUMERIC)
    expect(
      cells.slice(1).map((cell) => cell.className.includes(NUMERIC)),
    ).toEqual([true, true, true])
    // 表体的右对齐来自 pages.css 的 tbody 选择器；tfoot 只能用 align 属性补
    expect(cells.slice(1).map((cell) => cell.style.textAlign)).toEqual([
      'right',
      'right',
      'right',
    ])
  })

  it('单元格自带 align 时优先于列定义', () => {
    renderSummary([
      {
        key: 'label',
        dataIndex: 'warehouseName',
        value: '合计',
        align: 'right',
      },
      {
        key: 'amount',
        dataIndex: 'amount',
        value: '136180.02',
        align: 'center',
      },
    ])

    const cells = footerCells()
    expect(cells[0]?.style.textAlign).toBe('right')
    // 显式 align 覆盖数值列缺省的 right
    expect(cells[3]?.style.textAlign).toBe('center')
  })
})
