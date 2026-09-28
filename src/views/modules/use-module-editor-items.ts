import { removeEditorLineItems } from '@/module-system/editor/module-editor-line-item-removal'
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
  // 上游导入行同样走这里删除：来源分配由服务端按剩余明细重算，删除即释放，
  // 不回写其它行的数量或上限，也不要求被删行继续关联采购来源。
  const removeSelectedItems = () => {
    const itemRemovalSourceGroupKey =
      getModuleEditorItemBehavior(moduleKey)?.itemRemovalSourceGroupKey
    if (!itemRemovalSourceGroupKey) {
      removeSelectedItemsDirectly()
      return
    }
    setItems((current) =>
      removeEditorLineItems(current, selectedItemIds, {
        sourceGroupKey: itemRemovalSourceGroupKey,
      }),
    )
    clearSelectedItems()
  }
  const {
    itemColumns,
    itemTableComponents,
    itemColumnOrder,
    itemRowMenus,
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
    itemRowMenus,
    onItemColumnOrderChange,
    removeSelectedItems,
    selectedItemIds,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
