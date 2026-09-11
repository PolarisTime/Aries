import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { createContext } from 'react'

export interface DragHandleContextValue {
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  setActivatorNodeRef?: (element: HTMLElement | null) => void
}

export const DragHandleContext = createContext<DragHandleContextValue>({})
