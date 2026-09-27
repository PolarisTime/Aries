import { HolderOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Tooltip } from 'antd'
import { type CSSProperties, type HTMLAttributes, use, useMemo } from 'react'
import { ContextMenu } from '@/components/ContextMenu'
import { ITEM_DRAG_TYPE } from './pickup-list-draft'
import {
  DragHandleContext,
  type DragHandleContextValue,
} from './pickup-list-drag-context'
import { PickupRowMenuContext } from './pickup-list-row-menu'

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
  const rowMenus = use(PickupRowMenuContext)
  const rowMenu = rowMenus?.get(props['data-row-key'])
  // 行菜单挂在 <tr> 自身: Dropdown 以 cloneElement 注入事件, 不会在 tbody 里
  // 插入非表格元素(避免破坏表格 DOM 结构)。
  const row = (
    <tr
      {...props}
      ref={setNodeRef}
      className={`${props.className || ''}${isDragging ? ' purchase-pickup-list-row--dragging' : ''}`}
      style={style}
    />
  )

  return (
    <DragHandleContext.Provider value={contextValue}>
      {rowMenu ? (
        <ContextMenu
          ariaLabel={rowMenu.ariaLabel}
          items={rowMenu.items}
          onClick={rowMenu.onClick}
        >
          {row}
        </ContextMenu>
      ) : (
        row
      )}
    </DragHandleContext.Provider>
  )
}
