import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
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
    if (moduleKey !== 'freight-statement' && moduleKey !== 'freight-bill') {
      removeSelectedItemsDirectly()
      return
    }
    const selectedIds = new Set(selectedItemIds)
    const sourceGroupKey = (item: ModuleLineItem) => {
      if (moduleKey === 'freight-statement') {
        return item.sourceFreightBillId == null
          ? ''
          : String(item.sourceFreightBillId)
      }
      return String(item._parentRelationId || item.sourceNo || '')
    }
    const selectedSourceIds = new Set(
      items
        .filter((item) => selectedIds.has(item.id))
        .map(sourceGroupKey)
        .filter(Boolean),
    )
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
    itemColumnOrder,
    onItemColumnOrderChange,
    removeSelectedItems,
    selectedItemIds,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
