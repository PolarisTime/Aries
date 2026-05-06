import { ref, type Ref } from 'vue'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  applyMaterialToEditorLineItem,
  buildDefaultEditorLineItem,
  moveEditorLineItemByDrag,
  recalculateEditorLineItem,
} from './module-adapter-editor'

interface UseEditorItemSupportOptions {
  editorForm: Record<string, unknown>
  editorItems: Ref<ModuleLineItem[]>
  materialMap: Ref<Record<string, ModuleRecord>>
  canManageEditorItems: Ref<boolean>
}

export function useEditorItemSupport(options: UseEditorItemSupportOptions) {
  const draggedEditorItemId = ref<string>()
  const dragOverEditorItemId = ref<string>()
  const dragOverEditorItemPosition = ref<'before' | 'after'>('after')

  function updateEditorItems(nextItems: ModuleLineItem[]) {
    options.editorForm.items = nextItems
  }

  function refreshEditorItems() {
    updateEditorItems([...options.editorItems.value])
  }

  function resetEditorItemDragState() {
    draggedEditorItemId.value = undefined
    dragOverEditorItemId.value = undefined
    dragOverEditorItemPosition.value = 'after'
  }

  function addEditorItem() {
    updateEditorItems([
      ...options.editorItems.value,
      buildDefaultEditorLineItem(),
    ])
  }

  function removeEditorItem(itemId: string) {
    updateEditorItems(options.editorItems.value.filter((item) => String(item.id) !== itemId))
  }

  function handleEditorItemDragStart(itemId: string, event: DragEvent) {
    draggedEditorItemId.value = itemId
    dragOverEditorItemId.value = itemId
    dragOverEditorItemPosition.value = 'after'

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', itemId)
    }
  }

  function handleEditorItemDragEnd() {
    resetEditorItemDragState()
  }

  function getEditorItemRowClassName(record: ModuleLineItem) {
    const recordId = String(record.id)
    if (
      !draggedEditorItemId.value
      || dragOverEditorItemId.value !== recordId
      || draggedEditorItemId.value === recordId
    ) {
      return ''
    }

    return dragOverEditorItemPosition.value === 'before'
      ? 'editor-draggable-row-target-before'
      : 'editor-draggable-row-target-after'
  }

  function moveEditorItemByDrag(targetId: string) {
    const sourceId = draggedEditorItemId.value
    if (!sourceId || sourceId === targetId) {
      resetEditorItemDragState()
      return
    }

    updateEditorItems(
      moveEditorLineItemByDrag(
        options.editorItems.value,
        sourceId,
        targetId,
        dragOverEditorItemPosition.value,
      ),
    )
    resetEditorItemDragState()
  }

  function getEditorItemRowProps(record: ModuleLineItem) {
    if (!options.canManageEditorItems.value) {
      return {}
    }

    const recordId = String(record.id)
    return {
      onDragover: (event: DragEvent) => {
        if (!draggedEditorItemId.value) {
          return
        }

        event.preventDefault()
        const currentTarget = event.currentTarget as HTMLElement | null
        if (currentTarget) {
          const rect = currentTarget.getBoundingClientRect()
          dragOverEditorItemPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
        }
        dragOverEditorItemId.value = recordId
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move'
        }
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault()
        moveEditorItemByDrag(recordId)
      },
    }
  }

  function handleEditorItemNumberChange(item: ModuleLineItem, key: string, value: unknown) {
    if (value === undefined || value === null || value === '') {
      item[key] = undefined
      recalculateEditorLineItem(item, key)
      refreshEditorItems()
      return
    }
    const numericValue = typeof value === 'number' ? value : Number(value)
    item[key] = Number.isFinite(numericValue) ? numericValue : undefined
    recalculateEditorLineItem(item, key)
    refreshEditorItems()
  }

  function handleEditorItemTextChange(item: ModuleLineItem, key: string, value: string) {
    item[key] = value
  }

  function normalizeSelectValue(value: unknown) {
    if (typeof value === 'string' || typeof value === 'number') {
      return value
    }

    if (value && typeof value === 'object' && 'value' in value) {
      const nestedValue = (value as { value?: unknown }).value
      if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
        return nestedValue
      }
    }

    return undefined
  }

  function handleEditorItemValueChange(item: ModuleLineItem, key: string, value: unknown) {
    handleEditorItemTextChange(item, key, String(normalizeSelectValue(value) || ''))
    recalculateEditorLineItem(item, key)
    refreshEditorItems()
  }

  function handleEditorItemMaterialChange(item: ModuleLineItem, materialCode: string) {
    const normalizedMaterialCode = String(materialCode ?? '').trim()
    item.materialCode = normalizedMaterialCode
    applyMaterialToEditorLineItem(item, options.materialMap.value[normalizedMaterialCode])
    refreshEditorItems()
  }

  function handleEditorItemMaterialSelect(item: ModuleLineItem, value: unknown) {
    const normalizedValue = normalizeSelectValue(value)
    handleEditorItemMaterialChange(item, normalizedValue == null ? '' : String(normalizedValue))
  }

  function handleEditorItemInputChange(item: ModuleLineItem, key: string, event: Event) {
    handleEditorItemTextChange(item, key, (event.target as HTMLInputElement)?.value || '')
    refreshEditorItems()
  }

  function filterMaterialOption(input: string, option: { label?: unknown } | undefined) {
    return String(option?.label || '').toLowerCase().includes(input.toLowerCase())
  }

  return {
    addEditorItem,
    filterMaterialOption,
    getEditorItemRowClassName,
    getEditorItemRowProps,
    handleEditorItemDragEnd,
    handleEditorItemDragStart,
    handleEditorItemInputChange,
    handleEditorItemMaterialSelect,
    handleEditorItemNumberChange,
    handleEditorItemValueChange,
    removeEditorItem,
  }
}
