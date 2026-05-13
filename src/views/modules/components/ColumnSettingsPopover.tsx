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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HolderOutlined, SettingOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Checkbox from 'antd/es/checkbox'
import Divider from 'antd/es/divider'
import Popover from 'antd/es/popover'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import type { ReactNode } from 'react'
import type { ModuleColumnDefinition } from '@/types/module-page'

type Props = {
  columns: ModuleColumnDefinition[]
  orderedKeys?: string[]
  visibleKeys: string[]
  onToggle: (key: string) => void
  onOrderChange?: (order: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SortableColumnRowProps = {
  checked: boolean
  columnId: string
  label: ReactNode
  onToggle: () => void
}

function SortableColumnRow({
  checked,
  columnId,
  label,
  onToggle,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: 'var(--ant-color-text-tertiary)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <HolderOutlined />
      </span>
      <Checkbox checked={checked} onChange={onToggle}>
        {label}
      </Checkbox>
    </div>
  )
}

function reorderKeys(order: string[], activeId: string, overId: string) {
  const oldIndex = order.indexOf(activeId)
  const newIndex = order.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1) {
    return order
  }

  const next = [...order]
  next.splice(oldIndex, 1)
  next.splice(newIndex, 0, activeId)
  return next
}

export function ColumnSettingsPopover({
  columns,
  orderedKeys,
  visibleKeys,
  onToggle,
  onOrderChange,
  open,
  onOpenChange,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const fallbackOrder = columns.map((column) => column.dataIndex)
  const sortableKeys =
    orderedKeys?.filter((key) => fallbackOrder.includes(key)) || []
  const orderedSortableKeys = [
    ...sortableKeys,
    ...fallbackOrder.filter((key) => !sortableKeys.includes(key)),
  ]

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!onOrderChange || !over || active.id === over.id) {
      return
    }
    onOrderChange(
      reorderKeys(
        orderedSortableKeys,
        String(active.id),
        String(over.id),
      ),
    )
  }

  const content = (
    <Space orientation="vertical" size="small" style={{ minWidth: 240 }}>
      <Typography.Text strong>列设置</Typography.Text>
      <Divider style={{ margin: '4px 0 8px' }} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedSortableKeys}
          strategy={verticalListSortingStrategy}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {orderedSortableKeys.map((key) => {
              const column = columns.find((item) => item.dataIndex === key)
              if (!column) {
                return null
              }

              return (
                <SortableColumnRow
                  key={column.dataIndex}
                  columnId={column.dataIndex}
                  checked={visibleKeys.includes(column.dataIndex)}
                  onToggle={() => onToggle(column.dataIndex)}
                  label={column.title}
                />
              )
            })}
          </Space>
        </SortableContext>
      </DndContext>
    </Space>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Button icon={<SettingOutlined />}>列设置</Button>
    </Popover>
  )
}
