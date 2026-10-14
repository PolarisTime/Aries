import { Table, type TableColumnsType, type TableProps } from 'antd'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import { RowContextMenuContext } from '@/components/row-context-menu'

type BaseRecord = {
  id: string
}

interface Props<RecordType extends BaseRecord> {
  columns: TableColumnsType<RecordType>
  components?: TableProps<RecordType>['components']
  dataSource: RecordType[]
  emptyText: React.ReactNode
  rowClassName?: TableProps<RecordType>['rowClassName']
  /** 行右键菜单：按行 key 注入，与业务列表复用同一套 RowContextMenu 原语。 */
  itemRowMenus?: RowContextMenuMap
  onRow?: TableProps<RecordType>['onRow']
  className?: string
}

export function ModuleItemsTable<RecordType extends BaseRecord>({
  columns,
  components,
  dataSource,
  emptyText,
  rowClassName,
  itemRowMenus,
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

  /*
   * 有行菜单时把行容器替换为右键菜单包装, 保留列宽拖拽注入的其它 components。
   *
   * <p>调用方**已经**给了行组件时不再覆盖: 整行长按拖动传进来的
   * {@link RowDragSortRow} 内部已经包了 RowContextMenuRow(它自己读行菜单上下文),
   * 这里再包一层会把拖动监听换成"没有拖动"的普通行, 拖动直接静默失效。</p>
   */
  const providedRow = (components?.body as { row?: unknown } | undefined)?.row
  const resolvedComponents =
    itemRowMenus?.size && !providedRow
      ? {
          ...components,
          body: { ...components?.body, row: RowContextMenuRow },
        }
      : components

  const table = (
    <Table<RecordType>
      rowKey="id"
      size="small"
      bordered
      tableLayout="fixed"
      className={['module-detail-table', className || '']
        .filter(Boolean)
        .join(' ')}
      columns={columns}
      components={resolvedComponents}
      dataSource={dataSource}
      pagination={false}
      scroll={{ x: scrollX }}
      locale={{ emptyText }}
      rowClassName={rowClassName}
      onRow={onRow}
    />
  )

  return (
    <div className="module-items-table-shell">
      {itemRowMenus?.size ? (
        <RowContextMenuContext.Provider value={itemRowMenus}>
          {table}
        </RowContextMenuContext.Provider>
      ) : (
        table
      )}
    </div>
  )
}
