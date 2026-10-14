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
    handleRowReorder,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems: removeSelectedItemsDirectly,
    selectedItemIds,
  } = useModuleEditorItemInteractions({
    items,
    setItems,
    /*
     * 行序可改的前提与「管理列是否出现」同源: 能管理明细、上游导入未锁死、
     * 且模块行为表没有显式禁用拖拽排序(物流单/运费对账单的行序由上游单据决定)。
     */
    canReorderItems:
      canManageItems &&
      !parentImportedItemEditLocked &&
      !getModuleEditorItemBehavior(moduleKey)?.disablesItemReorder,
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
  })

  return {
    clearSelectedItems,
    handleRowReorder,
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
