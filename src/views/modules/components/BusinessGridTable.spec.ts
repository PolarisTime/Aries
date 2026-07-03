import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

vi.mock('antd', () => ({
  Empty: ({ description }: { description: ReactNode }) =>
    createElement('div', null, description),
  Table: ({ dataSource, onRow, rowClassName }: any) =>
    createElement(
      'table',
      null,
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
}))

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

  it('focuses rows and maps Space to row selection', () => {
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    expect(row).toHaveAttribute('tabIndex', '0')
    fireEvent.keyDown(row, { key: ' ', code: 'Space' })

    expect(onRowClick).toHaveBeenCalledWith({ id: 'row-1', name: '第一行' })
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })

  it('maps Enter to the existing row double click action', () => {
    const { row, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' })

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).toHaveBeenCalledWith({
      id: 'row-1',
      name: '第一行',
    })
  })

  it('does not trigger row keyboard actions from inner controls', () => {
    const { inlineButton, onRowClick, onRowDoubleClick } = renderGrid()

    fireEvent.keyDown(inlineButton, { key: ' ', code: 'Space' })
    fireEvent.keyDown(inlineButton, { key: 'Enter', code: 'Enter' })

    expect(onRowClick).not.toHaveBeenCalled()
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })
})
