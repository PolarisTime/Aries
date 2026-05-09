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
import type { TableColumnsType, TableProps } from 'antd'
import { Alert, Card, Empty, Table } from 'antd'
import type { SorterResult, SortOrder } from 'antd/es/table/interface'
import type { MouseEvent, ReactNode } from 'react'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { DraggableColumnHeader } from '@/views/modules/components/DraggableColumnHeader'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'

interface Props {
  config: ModulePageConfig
  filters: Record<string, unknown>
  total: number
  loading: boolean
  exporting: boolean
  records: ModuleRecord[]
  warningMessage: string
  columnVisibleKeys: string[]
  columnOrder: string[]
  columns: TableColumnsType<ModuleRecord>
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
  onReset: () => void
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onToggleColumn: (key: string) => void
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  page: number
  pageSize: number
  canCreate: boolean
  canExport: boolean
  toolbarActions: ModuleActionDefinition[]
  onAction: (action: ModuleActionDefinition) => void
  onPageChange: (page: number, pageSize: number) => void
  onColumnOrderChange: (order: string[]) => void
  onSortingChange: (columnKey?: string | number, order?: SortOrder) => void
}

export function BusinessGridContent({
  config,
  filters,
  total,
  loading,
  exporting,
  records,
  warningMessage,
  columnVisibleKeys,
  columnOrder,
  columns,
  rowSelection,
  rowClassName,
  onUpdateFilter,
  onSearch,
  onReset,
  onCreate,
  onExport,
  onRefresh,
  onToggleColumn,
  onRowClick,
  onRowDoubleClick,
  page,
  pageSize,
  canCreate,
  canExport,
  toolbarActions,
  onAction,
  onPageChange,
  onColumnOrderChange,
  onSortingChange,
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

  const draggableColumns = columns.map((col) => ({
    ...col,
    title: col.key ? (
      <DraggableColumnHeader columnId={String(col.key)}>
        {col.title as ReactNode}
      </DraggableColumnHeader>
    ) : (
      col.title
    ),
  }))

  return (
    <Card>
      <ModuleFilterToolbar
        config={config}
        filters={filters}
        onUpdateFilter={onUpdateFilter}
        onSearch={onSearch}
        onReset={onReset}
      />

      <ModuleTableToolbar
        canCreate={canCreate}
        canExport={canExport}
        total={total}
        loading={loading}
        exporting={exporting}
        onCreate={onCreate}
        onExport={onExport}
        onRefresh={onRefresh}
        toolbarActions={toolbarActions}
        onAction={onAction}
        extra={
          <ColumnSettingsPopover
            columns={config.columns}
            visibleKeys={columnVisibleKeys}
            onToggle={onToggleColumn}
          />
        }
      />

      {warningMessage ? (
        <Alert
          type="warning"
          showIcon
          title={warningMessage}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          <div className="module-table-shell">
            <Table
              rowKey="id"
              bordered
              size="small"
              loading={loading}
              columns={draggableColumns}
              dataSource={records}
              rowSelection={rowSelection}
              scroll={{ x: 'max-content' }}
              rowClassName={rowClassName}
              onRow={(record) => ({
                onClick: (event: MouseEvent<HTMLElement>) => {
                  const target = event.target as HTMLElement | null
                  if (
                    target?.closest(
                      'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
                    )
                  ) {
                    return
                  }
                  onRowClick(record)
                },
                onDoubleClick: (event: MouseEvent<HTMLElement>) => {
                  const target = event.target as HTMLElement | null
                  if (
                    target?.closest(
                      'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
                    )
                  ) {
                    return
                  }
                  onRowDoubleClick(record)
                },
              })}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无数据"
                  />
                ),
              }}
              onChange={(_pagination, _filters, sorter) => {
                const activeSorter = Array.isArray(sorter)
                  ? sorter[0]
                  : (sorter as SorterResult<ModuleRecord>)
                const columnKey = activeSorter?.columnKey
                onSortingChange(
                  typeof columnKey === 'bigint' ? String(columnKey) : columnKey,
                  activeSorter?.order,
                )
              }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (count) => `共 ${count} 条`,
                onChange: onPageChange,
              }}
            />
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  )
}
