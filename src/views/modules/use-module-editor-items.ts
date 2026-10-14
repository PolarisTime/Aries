import { removeEditorLineItems } from '@/module-system/editor/module-editor-line-item-removal'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { getModuleEditorItemBehavior } from '@/views/modules/module-editor-item-behaviors'
import { canReorderModuleEditorItems } from '@/views/modules/module-editor-item-capabilities'
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
  /*
   * 行序判定统一走 canReorderModuleEditorItems(单一口径, 不要在调用点另加条件):
   * 能管理明细 + 模块行为表未显式禁用拖拽排序。
   *
   * <p>上游导入锁定**不**参与判定: 导入态已经允许「删除选中行」(删除即释放来源分配),
   * 行序管理与它同级; 拖动只改数组顺序, 不改任何导入字段值与来源分配, 服务端按
   * `line_no = 下标 + 1` 重编。要回到上游顺序用工具栏的「自动排序」。</p>
   */
  const itemReorderEnabled = canReorderModuleEditorItems({
    moduleKey,
    canManageItems,
    parentImportedItemEditLocked,
  })
  const {
    clearSelectedItems,
    handleRowReorder: reorderItems,
    handleSelectAll,
    handleSelectItem,
    removeSelectedItems: removeSelectedItemsDirectly,
    selectedItemIds,
  } = useModuleEditorItemInteractions({
    items,
    setItems,
    canReorderItems: itemReorderEnabled,
  })
  /*
   * 关掉拖动时返回 undefined(而不是"能拖但落位被忽略"): 上层据此不挂任何拖动监听,
   * 行既不会出现拖起态, 也不会在长按拖动后毫无反应。
   */
  const handleRowReorder = itemReorderEnabled ? reorderItems : undefined
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
