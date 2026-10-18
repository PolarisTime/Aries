import { useState } from 'react'
import { isParentImportedEditorLocked } from '@/module-system/adapter/module-adapter-editor'
import { sortItemsByMaterialDefault } from '@/module-system/editor/module-editor-item-sort'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import type {
  FreightStatementSortDirection,
  FreightStatementSortMode,
} from '@/views/modules/freight-statement-item-groups'
import { getModuleEditorItemBehavior } from '@/views/modules/module-editor-item-behaviors'
import { resolveModuleEditorItemCapabilities } from '@/views/modules/module-editor-item-capabilities'
import { useModuleEditorItems } from '@/views/modules/use-module-editor-items'

interface Options {
  moduleKey: string
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  editorFormValues: Record<string, unknown>
  canManageItems: boolean
  /**
   * 行序是否可调(拖动 / 上移下移 / Alt+↑↓)。
   *
   * <p><b>与 {@link canManageItems} 刻意分开</b>: 后者管的是「行内字段可编辑 + 能否增删行」,
   * 会被「明细行锁定」态(如销售订单的交付核定)关掉; 而拖动只重排数组下标、不改字段值,
   * 不应随之关闭。判定来源见 `canReorderEditorLineItems`。</p>
   */
  canReorderItems: boolean
  canAddManualItems: boolean
  canSave: boolean
  saving: boolean
  lineItemsLocked: boolean
  canEditItemColumns: boolean
}

/** 编辑器明细行的交互控制：可见性、选中/拖拽、列设置与上游导入锁定。 */
export function useModuleEditorItemControls({
  moduleKey,
  config,
  items,
  setItems,
  editorFormValues,
  canManageItems,
  canReorderItems,
  canAddManualItems,
  canSave,
  saving,
  lineItemsLocked,
  canEditItemColumns,
}: Options) {
  const parentImportedItemEditLocked = isParentImportedEditorLocked(
    moduleKey,
    editorFormValues,
    config.parentImport?.parentFieldKey,
  )
  const {
    canAddManualItemsForCurrentRecord,
    canImportParentItems,
    canManageCurrentItems,
  } = resolveModuleEditorItemCapabilities({
    moduleKey,
    config,
    parentImportedItemEditLocked,
    hasItems: items.length > 0,
    canManageItems,
    canAddManualItems,
    canSave,
    lineItemsLocked,
  })
  const editorItemBehavior = getModuleEditorItemBehavior(moduleKey)
  const parentImportVisible = Boolean(
    config.parentImport &&
      (config.parentImport.visibleWhen?.(editorFormValues) ?? true),
  )
  // 附加费用 Tab：采购订单/销售订单/物流单启用（行为表注册）。
  const supportsExpenseTab =
    Boolean(editorItemBehavior?.supportsExpenseTab) &&
    Boolean(config.itemColumns?.length)
  const canAutoSortItems =
    Boolean(editorItemBehavior?.itemSort) &&
    items.length > 1 &&
    !saving &&
    !lineItemsLocked

  const [freightStatementSortDirection, setFreightStatementSortDirection] =
    useState<FreightStatementSortDirection>('asc')
  /*
   * 自动排序(工具栏按钮): 行序默认可自由拖动调整(导入态也一样), 这个入口用来把明细
   * 重新排回业务默认顺序 —— 销售订单按商品资料规则、客户对账单按交货日期,
   * 物流/运费对账单还支持时间维度的升降序切换。
   */
  const handleAutoSortItems = (mode?: FreightStatementSortMode) => {
    const effectiveMode = mode ?? 'sourceNo'
    const itemSortBehavior = editorItemBehavior?.itemSort
    setItems((current) =>
      itemSortBehavior
        ? itemSortBehavior.sort(
            current,
            effectiveMode,
            effectiveMode === 'billTime'
              ? freightStatementSortDirection
              : 'asc',
          )
        : sortItemsByMaterialDefault(current),
    )
    if (itemSortBehavior?.directionToggleMode === effectiveMode) {
      setFreightStatementSortDirection((current) =>
        current === 'asc' ? 'desc' : 'asc',
      )
    }
  }

  const itemControls = useModuleEditorItems({
    moduleKey,
    supplierId: editorFormValues.supplierId,
    config,
    items,
    setItems,
    canManageItems: canManageCurrentItems && !saving,
    /*
     * 行序可调与「行内字段可编辑 / 能否增删行」分开传：交付核定这类锁定态锁的是
     * 字段值(销售订单锁 unitPrice), 而拖动只重排数组下标。若沿用 canManageCurrentItems,
     * 锁定态下连行序都不能调 —— 用户报的正是这个问题。
     */
    canReorderItems: canReorderItems && !saving,
    lineItemsLocked,
    canEditItemColumns: canEditItemColumns && !saving,
    parentImportedItemEditLocked,
  })

  return {
    ...itemControls,
    canAddManualItemsForCurrentRecord,
    canAutoSortItems,
    canImportParentItems,
    freightStatementSortDirection,
    handleAutoSortItems,
    parentImportVisible,
    supportsExpenseTab,
  }
}
