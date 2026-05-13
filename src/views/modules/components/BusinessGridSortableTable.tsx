import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import type { ColumnsType } from 'antd/es/table'
import type { ModuleRecord } from '@/types/module-page'
import { DraggableColumnHeader } from '@/views/modules/components/DraggableColumnHeader'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'

interface Props {
  moduleKey: string
  columns: ColumnsType<ModuleRecord>
  columnOrder: string[]
  dataSource: ModuleRecord[]
  loading: boolean
  rowSelection?: import('antd/es/table').TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
  onSortingChange: (
    columnKey?: string | number,
    order?: import('antd/es/table/interface').SortOrder,
  ) => void
  onColumnOrderChange: (order: string[]) => void
}

export function BusinessGridSortableTable({
  moduleKey,
  columns,
  columnOrder,
  dataSource,
  loading,
  rowSelection,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  page,
  pageSize,
  total,
  onPageChange,
  onSortingChange,
  onColumnOrderChange,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columnOrder.indexOf(String(active.id))
    const newIndex = columnOrder.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const next = [...columnOrder]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, String(active.id))
    onColumnOrderChange(next)
  }

  const tableColumns = columns.map((column) => ({
    ...column,
    title: column.key ? (
      <DraggableColumnHeader columnId={String(column.key)}>
        {column.title as ReactNode}
      </DraggableColumnHeader>
    ) : (
      column.title
    ),
  }))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columnOrder}
        strategy={horizontalListSortingStrategy}
      >
        <BusinessGridTable
          moduleKey={moduleKey}
          columns={tableColumns}
          dataSource={dataSource}
          loading={loading}
          rowSelection={rowSelection}
          rowClassName={rowClassName}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onSortingChange={onSortingChange}
        />
      </SortableContext>
    </DndContext>
  )
}
