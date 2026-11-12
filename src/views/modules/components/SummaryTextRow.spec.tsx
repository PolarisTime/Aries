// @vitest-environment jsdom

import { Table } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { joinSummaryParts, SummaryTextRow } from './SummaryTextRow'

interface Row {
  id: string
  amount?: number
}

const columns = [{ title: '金额', dataIndex: 'amount', key: 'amount' }]
const dataSource: Row[] = [{ id: 'r1', amount: 100 }]

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('joinSummaryParts', () => {
  it('按「标签 值」拼接，段之间用 · 连接', () => {
    expect(
      joinSummaryParts([
        { value: '合计（2 行）' },
        { label: '数量', value: '5' },
        { label: '金额', value: '136180.02' },
      ]),
    ).toBe('合计（2 行） · 数量 5 · 金额 136180.02')
  })

  it('没有值的段整段丢弃（避免出现只有标签没有数字的残段）', () => {
    expect(
      joinSummaryParts([
        { label: '数量', value: '5' },
        { label: '金额', value: null },
        { label: '重量', value: '' },
      ]),
    ).toBe('数量 5')
  })

  it('全部为空时返回空串，由组件判定不渲染整行', () => {
    expect(joinSummaryParts([{ label: '金额', value: null }])).toBe('')
    expect(joinSummaryParts([])).toBe('')
  })
})

describe('SummaryTextRow', () => {
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

  function renderRow(props: Parameters<typeof SummaryTextRow>[0]) {
    act(() => {
      root.render(
        createElement(Table<Row>, {
          rowKey: 'id',
          columns,
          dataSource,
          pagination: false,
          summary: () => createElement(SummaryTextRow, props),
        }),
      )
    })
  }

  function footerCells(): HTMLTableCellElement[] {
    return Array.from(
      container.querySelectorAll<HTMLTableCellElement>(
        'tfoot tr.module-summary-text-row > td',
      ),
    )
  }

  it('渲染成一个跨列单元格 + 一行文字', () => {
    renderRow({ colSpan: 3, parts: [{ label: '金额', value: '100.00' }] })

    const cells = footerCells()
    expect(cells).toHaveLength(1)
    expect(cells[0]?.getAttribute('colspan')).toBe('3')
    expect(cells[0]?.querySelector('.module-summary-text')?.textContent).toBe(
      '金额 100.00',
    )
  })

  it('没有可用段落时整行不渲染（空表交给 antd 空态）', () => {
    renderRow({ colSpan: 3, parts: [{ label: '金额', value: null }] })
    expect(footerCells()).toHaveLength(0)
  })

  it('页面既有的行/文字类名可以叠加，两个明细面各自保留自己的样式钩子', () => {
    renderRow({
      colSpan: 2,
      parts: [{ label: '金额', value: '1.00' }],
      rowClassName: 'module-detail-summary-row',
      textClassName: 'module-detail-summary-text',
    })

    // antd 会把 summary 的 Row 渲染成 tfoot 里的 tr（className 落在 tbody 之外的 tr 上）
    const row = container.querySelector(
      'tfoot tr.module-summary-text-row',
    ) as HTMLTableRowElement | null
    expect(row).not.toBeNull()
    expect(row?.className).toContain('module-detail-summary-row')
    expect(row?.className).toContain('module-detail-summary-row')
    const block = container.querySelector('.module-summary-text')
    expect(block?.className).toContain('module-detail-summary-text')
  })
})
