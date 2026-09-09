import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { getModuleEditorItemBehavior } from '@/views/modules/module-editor-item-behaviors'
import { useModuleEditorItemColumns } from '@/views/modules/use-module-editor-item-columns'
import { useModuleEditorItemInteractions } from '@/views/modules/use-module-editor-item-interactions'

interface Props {
  moduleKey: string
  supplierId?: unknown
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  canManageItems: boolean
  lineItemsLocked: boolean
  canEditItemColumns: boolean
  parentImportedItemEditLocked: boolean
}

export function useModuleEditorItems({
  config,
  items,
  setItems,
  canManageItems,
  lineItemsLocked,
  canEditItemColumns,
  parentImportedItemEditLocked,
  moduleKey,
  supplierId,
}: Props) {
  const {
    clearSelectedItems,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems: removeSelectedItemsDirectly,
    selectedItemIds,
  } = useModuleEditorItemInteractions({
    items,
    setItems,
  })
  const removeSelectedItems = () => {
    const itemRemovalSourceGroupKey =
      getModuleEditorItemBehavior(moduleKey)?.itemRemovalSourceGroupKey
    if (!itemRemovalSourceGroupKey) {
      removeSelectedItemsDirectly()
      return
    }
    const selectedIds = new Set(selectedItemIds)
    const sourceGroupKey = itemRemovalSourceGroupKey
    const selectedSourceIds = new Set<string>()
    for (const item of items) {
      if (!selectedIds.has(item.id)) continue
      const value = sourceGroupKey(item)
      if (value) selectedSourceIds.add(value)
    }
    setItems((current) =>
      current.filter((item) => {
        if (selectedIds.has(item.id)) return false
        const groupKey = sourceGroupKey(item)
        return !groupKey || !selectedSourceIds.has(groupKey)
      }),
    )
    clearSelectedItems()
  }
  const {
    itemColumns,
    itemTableComponents,
    itemColumnOrder,
    onItemColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  } = useModuleEditorItemColumns({
    moduleKey,
    supplierId,
    config,
    items,
    setItems,
    canManageItems,
    lineItemsLocked,
    canEditItemColumns,
    parentImportedItemEditLocked,
    selectedItemIds,
    onSelectAll: handleSelectAll,
    onSelectItem: handleSelectItem,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  })

  return {
    clearSelectedItems,
    handleDragOver,
    itemColumns,
    itemTableComponents,
    itemColumnOrder,
    onItemColumnOrderChange,
    removeSelectedItems,
    selectedItemIds,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
