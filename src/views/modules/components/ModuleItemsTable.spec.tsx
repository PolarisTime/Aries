import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('antd', () => {
  const Table = ({ columns, dataSource, emptyText }: any) => (
    <table data-testid="table">
      <thead>
        <tr>
          {columns?.map((col: any) => (
            <th key={col.dataIndex || col.key}>{col.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataSource?.length ? (
          dataSource.map((row: any) => (
            <tr key={row.id}>
              {columns?.map((col: any) => (
                <td key={col.dataIndex}>{String(row[col.dataIndex] ?? '')}</td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns?.length || 1}>{emptyText || 'No data'}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
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
})
