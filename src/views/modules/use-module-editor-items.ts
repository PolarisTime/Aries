import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { useModuleEditorItemColumns } from '@/views/modules/use-module-editor-item-columns'
import { useModuleEditorItemInteractions } from '@/views/modules/use-module-editor-item-interactions'

type Props = {
  moduleKey: string
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  canManageItems: boolean
  lineItemsLocked: boolean
}

export function useModuleEditorItems({
  config,
  items,
  setItems,
  canManageItems,
  lineItemsLocked,
  moduleKey,
}: Props) {
  const {
    clearSelectedItems,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems,
    selectedItemIds,
  } = useModuleEditorItemInteractions({
    items,
    setItems,
  })
  const {
    itemColumns,
    itemColumnOrder,
    onItemColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  } = useModuleEditorItemColumns({
    moduleKey,
    config,
    items,
    setItems,
    canManageItems,
    lineItemsLocked,
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
