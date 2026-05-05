import { type ReactNode } from 'react'
import { flexRender, type Table, type Row } from '@tanstack/react-table'
import { Spin, Empty } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface DataTableProps<TData> {
  table: Table<TData>
  loading?: boolean
  bordered?: boolean
  size?: 'small' | 'middle' | 'default'
  emptyText?: string
  onRowClick?: (row: Row<TData>) => void
  expandedRowRender?: (row: Row<TData>) => ReactNode
  summaryRender?: () => ReactNode
}

export function DataTable<TData>({
  table,
  loading = false,
  bordered = false,
  size = 'default',
  emptyText = '暂无数据',
  onRowClick,
  expandedRowRender,
  summaryRender,
}: DataTableProps<TData>) {
  const sizeClass = size === 'small' ? 'leo-data-table-small' : size === 'middle' ? 'leo-data-table-middle' : ''

  const handleRowClick = (row: Row<TData>) => {
    if (onRowClick) {
      // Don't trigger on interactive elements
      onRowClick(row)
    }
  }

  return (
    <div className={`leo-data-table-wrapper ${bordered ? 'leo-data-table-bordered' : ''} ${sizeClass}`}>
      <div className="leo-data-table">
        <table style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="leo-data-table-thead">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as Record<string, string> | undefined
                  const align = meta?.align || 'center'
                  const width = meta?.width
                  const fixed = meta?.fixed
                  const canSort = header.column.getCanSort()

                  return (
                    <th
                      key={header.id}
                      className={`leo-data-table-th ${canSort ? 'leo-data-table-sortable' : ''} ${fixed ? `leo-data-table-sticky-${fixed}` : ''} leo-data-table-align-${align}`}
                      style={{
                        width,
                        ...(fixed === 'left' ? { position: 'sticky', left: 0, zIndex: 2, background: '#fafafa' } : {}),
                        ...(fixed === 'right' ? { position: 'sticky', right: 0, zIndex: 2, background: '#fafafa' } : {}),
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="leo-data-table-sorter">
                            <span className={`leo-data-table-sorter-asc ${header.column.getIsSorted() === 'asc' ? 'leo-data-table-sorted-asc' : ''}`} />
                            <span className={`leo-data-table-sorter-desc ${header.column.getIsSorted() === 'desc' ? 'leo-data-table-sorted-desc' : ''}`} />
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody className="leo-data-table-tbody">
            {table.getRowModel().rows.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  className="leo-data-table-td leo-data-table-empty"
                >
                  <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <DataRow
                  key={row.id}
                  row={row}
                  onClick={handleRowClick}
                  expandedRowRender={expandedRowRender}
                />
              ))
            )}
          </tbody>

          {summaryRender && (
            <tfoot className="leo-data-table-tfoot">
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className="leo-data-table-td">
                  {summaryRender()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {loading && (
          <div className="leo-data-table-loading-overlay">
            <Spin indicator={<LoadingOutlined />} />
          </div>
        )}
      </div>
    </div>
  )
}

function DataRow<TData>({
  row,
  onClick,
  expandedRowRender,
}: {
  row: Row<TData>
  onClick?: (row: Row<TData>) => void
  expandedRowRender?: (row: Row<TData>) => ReactNode
}) {
  const isSelected = row.getIsSelected()
  const isExpanded = row.getIsExpanded()

  return (
    <>
      <tr
        className={`leo-data-table-row ${isSelected ? 'leo-data-table-row-selected' : ''} ${onClick ? 'leo-data-table-row-selectable' : ''}`}
        onClick={() => onClick?.(row)}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as Record<string, string> | undefined
          const align = meta?.align || 'center'
          const fixed = meta?.fixed
          const ellipsis = meta?.ellipsis

          return (
            <td
              key={cell.id}
              className={`leo-data-table-td ${fixed ? `leo-data-table-sticky-${fixed}` : ''} leo-data-table-align-${align} ${ellipsis ? 'leo-data-table-cell-ellipsis' : ''}`}
              style={{
                ...(fixed === 'left' ? { position: 'sticky', left: 0, zIndex: 1, background: isSelected ? '#e6f4ff' : '#fff' } : {}),
                ...(fixed === 'right' ? { position: 'sticky', right: 0, zIndex: 1, background: isSelected ? '#e6f4ff' : '#fff' } : {}),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )
        })}
      </tr>

      {isExpanded && expandedRowRender && (
        <tr className="leo-data-table-expanded-row">
          <td colSpan={row.getVisibleCells().length} className="leo-data-table-td" style={{ padding: '16px 24px', background: '#fafafa' }}>
            {expandedRowRender(row)}
          </td>
        </tr>
      )}
    </>
  )
}
