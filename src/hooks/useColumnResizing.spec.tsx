// @vitest-environment jsdom

import type { ColumnsType } from 'antd/es/table'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type UseColumnResizingResult,
  useColumnResizing,
} from '@/hooks/useColumnResizing'

interface Row {
  inboundNo: string
  supplier: string
}

const columnDefs: ColumnsType<Row> = [
  { key: 'inboundNo', dataIndex: 'inboundNo', title: '入库单号', width: 160 },
  { key: 'supplier', dataIndex: 'supplier', title: '供应商', width: 140 },
]

type HeaderCellMeta = Record<string, unknown>

/**
 * 列宽拖拽的起点口径。
 *
 * <p>业务列表会把容器富余按比例摊进每一列（`distributeSurplusWidth`），于是**渲染宽度 >
 * 声明宽度**。拖拽必须以声明宽度为起点，否则第一下会把「声明 + 富余」写成新声明宽度、
 * 再叠加一次富余，表现为"先被拉大，继续拖才变小"。</p>
 *
 * <p>本用例锁住这个口子：`onHeaderCell` 必须把声明宽度下发成 `data-column-width`，
 * 让 `ResizableHeaderCell` 能拿到它。</p>
 */
describe('useColumnResizing 列宽拖拽起点', () => {
  let container: HTMLDivElement
  let root: Root
  let captured: UseColumnResizingResult<Row> | null = null

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    captured = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(columnSizes: Record<string, number>) {
    function Harness() {
      captured = useColumnResizing<Row>({
        columns: columnDefs,
        columnSizes,
        onResizePreview: vi.fn(),
        onResizeCommit: vi.fn(),
        onResizeReset: vi.fn(),
      })
      return null
    }
    act(() => root.render(createElement(Harness)))
    return captured as unknown as UseColumnResizingResult<Row>
  }

  const headerMetaOf = (
    columns: ColumnsType<Row>,
    index: number,
  ): HeaderCellMeta => {
    const column = columns[index]
    const onHeaderCell = column?.onHeaderCell as
      | ((column: Row, index?: number) => HeaderCellMeta)
      | undefined
    return onHeaderCell?.(column as never, index) ?? {}
  }

  it('未调整过时, data-column-width 等于列定义里的宽度', () => {
    const result = render({})
    expect(headerMetaOf(result.columns, 0)['data-column-width']).toBe('160')
    expect(headerMetaOf(result.columns, 1)['data-column-width']).toBe('140')
  })

  it('调整过宽度后, data-column-width 跟随覆盖值(而不是原始默认值)', () => {
    const result = render({ inboundNo: 96 })
    const meta = headerMetaOf(result.columns, 0)
    expect(meta['data-column-width']).toBe('96')
    // 默认值另存一份, 供双击把手复位
    expect(meta['data-default-width']).toBe('160')
  })

  it('表头仍声明可拖拽标记与 min/max, ResizableHeaderCell 依赖这些属性', () => {
    const result = render({})
    const meta = headerMetaOf(result.columns, 0)
    expect(meta['data-resizable']).toBe('true')
    expect(meta['data-column-key']).toBe('inboundNo')
    expect(Number(meta['data-min-width'])).toBeGreaterThan(0)
    expect(Number(meta['data-max-width'])).toBeGreaterThan(
      Number(meta['data-min-width']),
    )
  })

  it('columns 未定义宽度时不下发 data-column-width(交给渲染宽度兜底)', () => {
    function Harness() {
      captured = useColumnResizing<Row>({
        columns: [
          { key: 'inboundNo', dataIndex: 'inboundNo', title: '入库单号' },
        ],
        columnSizes: {},
        onResizePreview: vi.fn(),
        onResizeCommit: vi.fn(),
        onResizeReset: vi.fn(),
      })
      return null
    }
    act(() => root.render(createElement(Harness)))
    const result = captured as unknown as UseColumnResizingResult<Row>
    const meta = headerMetaOf(result.columns, 0)
    // 不可拖拽(没有 width 的列不参与拖拽) → 不下发拖拽元数据
    expect(meta['data-resizable']).toBeUndefined()
    expect(meta['data-column-width']).toBeUndefined()
  })
})
