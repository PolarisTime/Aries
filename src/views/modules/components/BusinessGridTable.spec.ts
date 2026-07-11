import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  computeTableScrollX,
  parseTableColumnWidth,
} from '@/views/modules/components/business-grid-table-utils'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/useDeferredColumns', () => ({
  useDeferredColumns: (columns: unknown) => columns,
}))

vi.mock('antd', () => {
  const Empty = ({ description }: { description: ReactNode }) =>
    createElement('div', null, description)
  Empty.PRESENTED_IMAGE_SIMPLE = 'simple'

  return {
    Empty,
    Table: ({
      columns,
      dataSource,
      loading,
      locale,
      onRow,
      rowClassName,
      rowSelection,
      scroll,
      virtual,
    }: any) =>
      createElement(
        'div',
        {
          'data-testid': 'mock-table',
          'data-loading': String(Boolean(loading)),
          'data-scroll-x': scroll?.x == null ? '' : String(scroll.x),
          'data-scroll-y': scroll?.y == null ? '' : String(scroll.y),
          'data-selection-column-width': rowSelection?.columnWidth
            ? String(rowSelection.columnWidth)
            : '',
          'data-virtual': String(Boolean(virtual)),
        },
        dataSource.length === 0
          ? createElement(
              'div',
              { 'data-testid': 'empty-text' },
              locale.emptyText,
            )
          : createElement(
              'table',
              null,
              columns.length
                ? createElement(
                    'thead',
                    { className: 'ant-table-thead' },
                    createElement(
                      'tr',
                      null,
                      columns.map(
                        (column: { dataIndex?: string; title?: string }) =>
                          createElement(
                            'th',
                            { key: column.dataIndex || column.title },
                            column.title as ReactNode,
                          ),
                      ),
                    ),
                  )
                : null,
              createElement(
                'tbody',
                null,
                dataSource.map((record: ModuleRecord) => {
                  const rowProps = onRow(record)
                  return createElement(
                    'tr',
                    {
                      key: record.id,
                      'data-testid': `row-${record.id}`,
                      className: rowClassName(record),
                      ...rowProps,
                    },
                    createElement('td', null, record.name as ReactNode),
                    createElement(
                      'td',
                      null,
                      createElement('button', { type: 'button' }, '行内操作'),
                    ),
                  )
                }),
              ),
            ),
      ),
  }
})

const makeRect = (overrides: Partial<DOMRect> = {}) =>
  ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...overrides,
  }) as DOMRect

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('computeTableBodyScrollY', () => {
  it('should reserve space for table header and pagination', () => {
    expect(computeTableBodyScrollY(600, 48, 56)).toBe(496)
  })

  it('should keep a safe minimum height for small containers', () => {
    expect(computeTableBodyScrollY(220, 48, 56)).toBe(240)
  })
})

describe('parseTableColumnWidth', () => {
  it('should normalize numeric and px string widths', () => {
    expect(parseTableColumnWidth(150)).toBe(150)
    expect(parseTableColumnWidth('180px')).toBe(180)
  })

  it('should fall back for missing or non-numeric widths', () => {
    expect(parseTableColumnWidth(undefined)).toBe(120)
    expect(parseTableColumnWidth('max-content')).toBe(120)
  })
})

describe('computeTableScrollX', () => {
  it('should stretch narrow tables to the container width', () => {
    expect(
      computeTableScrollX({
        columnWidths: [140, '180px', undefined],
        containerWidth: 960,
        selectionColumnWidth: 40,
      }),
    ).toBeUndefined()
  })

  it('should keep horizontal scroll for wide tables', () => {
    expect(
      computeTableScrollX({
        columnWidths: [300, '320px', 280],
        containerWidth: 720,
        selectionColumnWidth: 40,
      }),
    ).toBe(940)
  })
})

describe('computeTableAvailableHeight', () => {
  it('should fill the remaining viewport when the flex container is short', () => {
    expect(
      computeTableAvailableHeight({
        containerHeight: 260,
        viewportHeight: 900,
        containerTop: 320,
        bottomInset: 16,
      }),
    ).toBe(564)
  })

  it('should keep the measured container height when it is larger', () => {
    expect(
      computeTableAvailableHeight({
        containerHeight: 640,
        viewportHeight: 900,
        containerTop: 320,
        bottomInset: 16,
      }),
    ).toBe(640)
  })
})

describe('buildTableScrollConfig', () => {
  it('should avoid Ant Design scroll containers for empty tables', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 0,
        isVirtual: false,
        scrollX: 940,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toBeUndefined()
  })

  it('should keep scroll config when table has rows', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 1,
        isVirtual: false,
        scrollX: 940,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toEqual({ x: 940, y: 480 })
  })

  it('should provide a numeric x value for virtual tables', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 120,
        isVirtual: true,
        scrollX: undefined,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toEqual({ x: 720, y: 480 })
  })
})

describe('BusinessGridTable layout and rendering', () => {
  const renderGrid = ({
    columns = [{ title: '名称', dataIndex: 'name', width: 120 }],
    dataSource = [{ id: 'row-1', name: '第一行' }],
    loading = false,
    rowSelection,
  }: {
    columns?: Array<{ title: string; dataIndex: string; width?: number }>
    dataSource?: ModuleRecord[]
    loading?: boolean
    rowSelection?: Record<string, unknown>
  } = {}) => {
    const onRowClick = vi.fn()
    const onRowDoubleClick = vi.fn()

    render(
      createElement(BusinessGridTable, {
        moduleKey: 'sales-order',
        columns,
        dataSource,
        loading,
        rowSelection,
        rowClassName: () => 'business-row',
        onRowClick,
        onRowDoubleClick,
      }),
    )

    return { onRowClick, onRowDoubleClick }
  }

  it('renders translated empty text without scroll containers for empty data', () => {
    renderGrid({ dataSource: [] })

    expect(screen.getByTestId('empty-text')).toHaveTextContent(
      'modules.table.noData',
    )
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-x',
      '',
    )
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-y',
      '',
    )
  })

  it('skips layout measurement when ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined)

    renderGrid()

    expect(typeof ResizeObserver).toBe('undefined')
    await waitFor(() => {
      expect(screen.getByTestId('mock-table')).toHaveAttribute(
        'data-scroll-y',
        '240',
      )
    })
  })

  it('passes row selection width and selected row aria state', () => {
    renderGrid({
      rowSelection: {
        selectedRowKeys: ['row-1'],
        onChange: vi.fn(),
      },
    })

    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-selection-column-width',
      '40',
    )
    expect(screen.getByTestId('row-row-1')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('row-row-1')).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter',
    )
    expect(screen.getByTestId('row-row-1')).toHaveAttribute(
      'title',
      'Enter 打开单据',
    )
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-x',
      '160',
    )
  })

  it('enables virtual table mode for large data sets', () => {
    renderGrid({
      dataSource: Array.from({ length: 101 }, (_, index) => ({
        id: `row-${index}`,
        name: `第 ${index} 行`,
      })),
    })

    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-virtual',
      'true',
    )
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-x',
      '120',
    )
  })

  it('measures shell size and keeps stable scroll values on repeated resize', async () => {
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        private readonly callback: ResizeObserverCallback

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }

        observe() {
          this.callback([], this as unknown as ResizeObserver)
        }

        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains('module-table-shell')) {
          return makeRect({ top: 100 })
        }
        if (this.classList.contains('ant-table-thead')) {
          return makeRect({ height: 42 })
        }
        return makeRect()
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('module-table-shell') ? 700 : 0
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('module-table-shell') ? 640 : 0
      },
    )

    renderGrid({ loading: true })

    await waitFor(() => {
      expect(screen.getByTestId('mock-table')).toHaveAttribute(
        'data-scroll-y',
        '658',
      )
    })
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-loading',
      'true',
    )
    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-x',
      '',
    )
  })

  it('keeps the minimum body height when the measured space is empty', () => {
    vi.stubGlobal('innerHeight', 0)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        private readonly callback: ResizeObserverCallback

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }

        observe() {
          this.callback([], this as unknown as ResizeObserver)
        }

        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(0)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      makeRect(),
    )

    renderGrid({ columns: [] })

    expect(screen.getByTestId('mock-table')).toHaveAttribute(
      'data-scroll-y',
      '240',
    )
  })

  it('falls back to zero header height when Ant Design header is absent', async () => {
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        private readonly callback: ResizeObserverCallback

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }

        observe() {
          this.callback([], this as unknown as ResizeObserver)
        }

        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('module-table-shell')
          ? makeRect({ top: 100 })
          : makeRect()
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('module-table-shell') ? 700 : 0
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('module-table-shell') ? 640 : 0
      },
    )

    renderGrid({ columns: [] })

    await waitFor(() => {
      expect(screen.getByTestId('mock-table')).toHaveAttribute(
        'data-scroll-y',
        '700',
      )
    })
  })
})

describe('BusinessGridTable keyboard row interactions', () => {
  const renderGrid = () => {
    const onRowClick = vi.fn()
    const onRowDoubleClick = vi.fn()
    render(
      createElement(BusinessGridTable, {
        moduleKey: 'sales-order',
        columns: [{ title: '名称', dataIndex: 'name' }],
        dataSource: [{ id: 'row-1', name: '第一行' }],
        loading: false,
        rowClassName: () => 'business-row',
        onRowClick,
        onRowDoubleClick,
      }),
    )

    return {
      row: screen.getByTestId('row-row-1'),
      inlineButton: screen.getByText('行内操作'),
      onRowClick,
      onRowDoubleClick,
    }
  }

  it('focuses rows without mapping Space to checkbox selection', () => {
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    expect(row).toHaveAttribute('tabIndex', '0')
    fireEvent.keyDown(row, { key: ' ', code: 'Space' })

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })

  it('maps Enter to opening the row', () => {
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' })

    expect(onRowDoubleClick).toHaveBeenCalledWith({
      id: 'row-1',
      name: '第一行',
    })
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('does not trigger row keyboard actions from inner controls', () => {
    const { inlineButton, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.keyDown(inlineButton, { key: ' ', code: 'Space' })
    fireEvent.keyDown(inlineButton, { key: 'Enter', code: 'Enter' })

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })

  it('maps a settled row click to selection and ignores inner controls', () => {
    vi.useFakeTimers()
    const { row, inlineButton, onRowClick } = renderGrid()

    fireEvent.click(row)
    fireEvent.click(inlineButton)

    expect(onRowClick).not.toHaveBeenCalled()
    act(() => vi.runAllTimers())

    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).toHaveBeenCalledWith({ id: 'row-1', name: '第一行' })
  })

  it('cancels the pending selection when the row is double clicked', () => {
    vi.useFakeTimers()
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.click(row, { detail: 1 })
    fireEvent.click(row, { detail: 2 })
    fireEvent.doubleClick(row)
    act(() => vi.runAllTimers())

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).toHaveBeenCalledTimes(1)
    expect(onRowDoubleClick).toHaveBeenCalledWith({
      id: 'row-1',
      name: '第一行',
    })
  })

  it('clears a pending row click when the table unmounts', () => {
    vi.useFakeTimers()
    const onRowClick = vi.fn()
    const { unmount } = render(
      createElement(BusinessGridTable, {
        moduleKey: 'sales-order',
        columns: [{ title: '名称', dataIndex: 'name' }],
        dataSource: [{ id: 'row-1', name: '第一行' }],
        loading: false,
        rowClassName: () => 'business-row',
        onRowClick,
        onRowDoubleClick: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByTestId('row-row-1'))
    unmount()
    act(() => vi.runAllTimers())

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('debounces row double click and ignores inner control double clicks', () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1200)
      .mockReturnValueOnce(1700)
    const { row, inlineButton, onRowDoubleClick } = renderGrid()

    fireEvent.doubleClick(row)
    fireEvent.doubleClick(row)
    fireEvent.doubleClick(row)
    fireEvent.doubleClick(inlineButton)

    expect(onRowDoubleClick).toHaveBeenCalledTimes(2)
    expect(onRowDoubleClick).toHaveBeenCalledWith({
      id: 'row-1',
      name: '第一行',
    })
  })

  it('ignores unrelated keyboard keys on rows', () => {
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.keyDown(row, { key: 'Escape', code: 'Escape' })

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })
})
