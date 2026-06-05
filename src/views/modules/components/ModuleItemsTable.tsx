import { Table, type TableColumnsType, type TableProps } from 'antd'

type BaseRecord = {
  id: string
}

interface Props<RecordType extends BaseRecord> {
  columns: TableColumnsType<RecordType>
  dataSource: RecordType[]
  emptyText: React.ReactNode
  rowClassName?: TableProps<RecordType>['rowClassName']
  onRow?: TableProps<RecordType>['onRow']
  className?: string
}

export function ModuleItemsTable<RecordType extends BaseRecord>({
  columns,
  dataSource,
  emptyText,
  rowClassName,
  onRow,
  className,
}: Props<RecordType>) {
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

  return (
    <Table<RecordType>
      rowKey="id"
      size="small"
      bordered
      tableLayout="fixed"
      className={['module-detail-table', className || '']
        .filter(Boolean)
        .join(' ')}
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      scroll={{ x: scrollX }}
      locale={{ emptyText }}
      rowClassName={rowClassName}
      onRow={onRow}
    />
  )
}
