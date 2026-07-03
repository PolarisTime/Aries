import { HolderOutlined, SettingOutlined } from '@ant-design/icons'
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Checkbox, Divider, Popover, Space, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleColumnDefinition } from '@/types/module-page'

interface Props {
  columns: ModuleColumnDefinition[]
  orderedKeys?: string[]
  visibleKeys: string[]
  onToggle: (key: string) => void
  onOrderChange?: (order: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SortableColumnRowProps {
  checked: boolean
  columnId: string
  dragLabel: string
  label: ReactNode
  onToggle: () => void
}

function SortableColumnRow({
  checked,
  columnId,
  dragLabel,
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
      className="flex items-center gap-8"
      /* DnD 动态样式：transform/transition/opacity 由拖拽状态实时计算 */
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-tertiary inline-flex items-center border-0 bg-transparent p-0"
        aria-label={dragLabel}
      >
        <HolderOutlined />
      </button>
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
  const { t } = useTranslation()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
      reorderKeys(orderedSortableKeys, String(active.id), String(over.id)),
    )
  }

  const content = (
    <Space
      orientation="vertical"
      size="small"
      className="min-w-[200px] max-w-[280px]"
    >
      <Typography.Text strong>{t('common.columnSettings')}</Typography.Text>
      <Divider className="my-4 mb-8" />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedSortableKeys}
          strategy={verticalListSortingStrategy}
        >
          <Space orientation="vertical" size="small" className="w-full">
            {orderedSortableKeys.map((key) => {
              const column = columns.find((item) => item.dataIndex === key)
              if (!column) {
                return null
              }

              return (
                <SortableColumnRow
                  key={column.dataIndex}
                  columnId={column.dataIndex}
                  dragLabel={`拖动列：${column.title}`}
                  checked={visibleKeys.includes(column.dataIndex)}
                  onToggle={() => onToggle(column.dataIndex)}
                  label={<span className="text-xs">{column.title}</span>}
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
      styles={{ container: { maxWidth: 300 } }}
    >
      <Button icon={<SettingOutlined />}>{t('common.columnSettings')}</Button>
    </Popover>
  )
}
