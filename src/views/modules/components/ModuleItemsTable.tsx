import type { TableColumnsType, TableProps } from 'antd'
import Table from 'antd/es/table'

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
  return (
    <Table<RecordType>
      rowKey="id"
      size="small"
      bordered
      className={['module-detail-table', className || '']
        .filter(Boolean)
        .join(' ')}
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText }}
      rowClassName={rowClassName}
      onRow={onRow}
    />
  )
}
