import { HolderOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Tooltip } from 'antd'
import { type CSSProperties, type HTMLAttributes, use, useMemo } from 'react'
import { ITEM_DRAG_TYPE } from './pickup-list-draft'
import {
  DragHandleContext,
  type DragHandleContextValue,
} from './pickup-list-drag-context'

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

export function DragHandle({ label }: { label: string }) {
  const { attributes, listeners, setActivatorNodeRef } = use(DragHandleContext)

  return (
    <Tooltip title={label}>
      <Button
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}
        aria-label={label}
        className="purchase-pickup-list-drag-handle"
        icon={<HolderOutlined />}
        size="small"
        type="text"
      />
    </Tooltip>
  )
}

export function SortableRow(props: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
    data: { type: ITEM_DRAG_TYPE },
  })
  const style: CSSProperties = {
    ...props.style,
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 2, opacity: 0.72 } : {}),
  }
  const contextValue = useMemo<DragHandleContextValue>(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef],
  )

  return (
    <DragHandleContext.Provider value={contextValue}>
      <tr
        {...props}
        ref={setNodeRef}
        className={`${props.className || ''}${isDragging ? ' purchase-pickup-list-row--dragging' : ''}`}
        style={style}
      />
    </DragHandleContext.Provider>
  )
}
