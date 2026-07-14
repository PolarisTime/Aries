import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tableState = vi.hoisted(() => ({
  calls: [] as any[],
}))

vi.mock('antd', () => {
  const Table = (props: any) => {
    tableState.calls.push(props)

    const columns = props.columns ?? []
    const dataSource = props.dataSource ?? []

    return (
      <table data-testid="table" className={props.className}>
        <thead>
          <tr>
            {columns.map((col: any, index: number) => (
              <th key={col.dataIndex || col.key || index}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.length ? (
            dataSource.map((row: any) => (
              <tr key={row.id}>
                {columns.map((col: any, index: number) => (
                  <td key={col.dataIndex || col.key || index}>
                    {String(row[col.dataIndex] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length || 1}>
                {props.locale?.emptyText || 'No data'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }
  return { Table }
})

import { ModuleItemsTable } from '@/views/modules/components/ModuleItemsTable'

describe('ModuleItemsTable', () => {
  const defaultProps = {
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Value', dataIndex: 'value' },
    ],
    dataSource: [
      { id: '1', name: 'Item 1', value: '100' },
      { id: '2', name: 'Item 2', value: '200' },
    ],
    emptyText: 'No data',
  }

  const latestTableProps = () => {
    const props = tableState.calls.at(-1)
    expect(props).toBeTruthy()
    return props
  }

  beforeEach(() => {
    tableState.calls.length = 0
  })

  it('renders table', () => {
    render(<ModuleItemsTable {...defaultProps} />)
    expect(screen.getByTestId('table')).toBeTruthy()
  })

  it('renders column headers', () => {
    render(<ModuleItemsTable {...defaultProps} />)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Value')).toBeTruthy()
  })

  it('renders data rows', () => {
    render(<ModuleItemsTable {...defaultProps} />)
    expect(screen.getByText('Item 1')).toBeTruthy()
    expect(screen.getByText('Item 2')).toBeTruthy()
  })

  it('renders empty text when no data', () => {
    render(<ModuleItemsTable {...defaultProps} dataSource={[]} />)
    expect(screen.getByText('No data')).toBeTruthy()
  })

  it('passes table defaults and keeps className optional', () => {
    render(<ModuleItemsTable {...defaultProps} />)
    const props = latestTableProps()

    expect(props).toMatchObject({
      rowKey: 'id',
      size: 'small',
      bordered: true,
      tableLayout: 'fixed',
      pagination: false,
      columns: defaultProps.columns,
      dataSource: defaultProps.dataSource,
      locale: { emptyText: 'No data' },
    })
    expect(props.className).toBe('module-detail-table')
  })

  it('merges className and passes row hooks through to Table', () => {
    const rowClassName = vi.fn((record) => `row-${record.id}`)
    const onRow = vi.fn((record) => ({
      'data-row-id': record.id,
      onClick: vi.fn(),
    }))

    render(
      <ModuleItemsTable
        {...defaultProps}
        className="custom-table"
        rowClassName={rowClassName}
        onRow={onRow}
      />,
    )
    const props = latestTableProps()

    expect(props.className).toBe('module-detail-table custom-table')
    expect(props.rowClassName).toBe(rowClassName)
    expect(props.onRow).toBe(onRow)
    expect(props.rowClassName(defaultProps.dataSource[0], 0)).toBe('row-1')
    expect(props.onRow(defaultProps.dataSource[1], 1)).toMatchObject({
      'data-row-id': '2',
    })
  })

  it('calculates scroll.x from numeric, px, non-number, and missing widths', () => {
    render(
      <ModuleItemsTable
        columns={[
          { title: 'Number', dataIndex: 'numberWidth', width: 96 },
          { title: 'Px', dataIndex: 'pxWidth', width: '160px' },
          { title: 'Non-number', dataIndex: 'nonNumberWidth', width: 'auto' },
          { title: 'Default', dataIndex: 'defaultWidth' },
        ]}
        dataSource={[
          {
            id: '1',
            numberWidth: '96',
            pxWidth: '160',
            nonNumberWidth: 'auto',
            defaultWidth: 'default',
          },
        ]}
        emptyText="Empty"
      />,
    )

    expect(latestTableProps().scroll).toEqual({ x: 512 })
  })

  it('keeps scroll.x undefined and renders fallback colspan when columns are empty', () => {
    render(<ModuleItemsTable columns={[]} dataSource={[]} emptyText="Empty" />)

    expect(latestTableProps().scroll).toEqual({ x: undefined })
    expect(screen.getByText('Empty')).toHaveAttribute('colSpan', '1')
  })
})
