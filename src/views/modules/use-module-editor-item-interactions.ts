import { useState } from 'react'
import type { EditorItemDragPosition } from '@/module-system/module-adapter-editor'
import { moveEditorLineItemByDrag } from '@/module-system/module-adapter-editor'
import type { ModuleLineItem } from '@/types/module-page'

interface Props {
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
}

export function useModuleEditorItemInteractions({ items, setItems }: Props) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] =
    useState<EditorItemDragPosition>('before')

  const clearSelectedItems = () => {
    setSelectedItemIds([])
  }

  const removeSelectedItems = () => {
    if (!selectedItemIds.length) return
    setItems((prev) =>
      prev.filter((item) => !selectedItemIds.includes(item.id)),
    )
    setSelectedItemIds([])
  }

  const handleDragStart = (itemId: string, e: React.DragEvent) => {
    setDragSourceId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragOver = (itemId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSourceId && dragSourceId !== itemId) {
      setDragTargetId(itemId)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      setDragPosition(e.clientY < midY ? 'before' : 'after')
    }
  }

  const handleDragEnd = () => {
    if (dragSourceId && dragTargetId && dragSourceId !== dragTargetId) {
      setItems((prev) =>
        moveEditorLineItemByDrag(
          prev,
          dragSourceId,
          dragTargetId,
          dragPosition,
        ),
      )
    }
    setDragSourceId(null)
    setDragTargetId(null)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? items.map((item) => item.id) : [])
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId),
    )
  }

  return {
    clearSelectedItems,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems,
    selectedItemIds,
  }
}
