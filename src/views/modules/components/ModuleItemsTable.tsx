import { Table, type TableColumnsType, type TableProps } from 'antd'
import { useEffect, useRef, useState } from 'react'

type BaseRecord = {
  id: string
}

interface Props<RecordType extends BaseRecord> {
  columns: TableColumnsType<RecordType>
  components?: TableProps<RecordType>['components']
  dataSource: RecordType[]
  emptyText: React.ReactNode
  rowClassName?: TableProps<RecordType>['rowClassName']
  onRow?: TableProps<RecordType>['onRow']
  className?: string
}

export function ModuleItemsTable<RecordType extends BaseRecord>({
  columns,
  components,
  dataSource,
  emptyText,
  rowClassName,
  onRow,
  className,
}: Props<RecordType>) {
  const tableShellRef = useRef<HTMLDivElement>(null)
  const [needsHorizontalScroll, setNeedsHorizontalScroll] = useState(false)
  const scrollX = (() => {
    let total = 0
    for (const col of columns) {
      const w = (col as Record<string, unknown>).width
      if (typeof w === 'number') total += w
      else if (typeof w === 'string') {
        const n = Number.parseInt(w, 10)
        total += Number.isFinite(n) ? n : 128
      } else total += 128
    }
    return total || undefined
  })()

  useEffect(() => {
    if (!scrollX) {
      setNeedsHorizontalScroll(false)
      return
    }

    const measureHorizontalOverflow = () => {
      const tableShell = tableShellRef.current
      const tableContent =
        tableShell?.querySelector<HTMLElement>('.ant-table-content')
      if (!tableContent) return
      setNeedsHorizontalScroll(
        tableContent.scrollWidth > tableContent.clientWidth + 1,
      )
    }

    measureHorizontalOverflow()
    const tableShell = tableShellRef.current
    const tableContent =
      tableShell?.querySelector<HTMLElement>('.ant-table-content')
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureHorizontalOverflow)
    if (tableShell) resizeObserver?.observe(tableShell)
    if (tableContent) resizeObserver?.observe(tableContent)
    window.addEventListener('resize', measureHorizontalOverflow)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureHorizontalOverflow)
    }
  }, [scrollX])

  return (
    <div ref={tableShellRef} className="module-items-table-shell">
      <Table<RecordType>
        rowKey="id"
        size="small"
        bordered
        tableLayout="fixed"
        className={['module-detail-table', className || '']
          .filter(Boolean)
          .join(' ')}
        columns={columns}
        components={components}
        dataSource={dataSource}
        pagination={false}
        scroll={needsHorizontalScroll ? { x: scrollX } : undefined}
        locale={{ emptyText }}
        rowClassName={rowClassName}
        onRow={onRow}
      />
    </div>
  )
}
