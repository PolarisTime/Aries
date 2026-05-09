import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface Props {
  columnId: string
  children: ReactNode
}

export function DraggableColumnHeader({ columnId, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
    display: 'inline-flex',
    alignItems: 'center',
    width: '100%',
  }

  return (
    <span ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </span>
  )
}
