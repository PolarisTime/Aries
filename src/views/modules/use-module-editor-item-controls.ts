import { useState } from 'react'
import { isParentImportedEditorLocked } from '@/module-system/adapter/module-adapter-editor'
import { sortItemsByMaterialDefault } from '@/module-system/editor/module-editor-item-sort'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import { sortCustomerStatementItemsByDeliveryDate } from '@/views/modules/customer-statement-item-groups'
import {
  type FreightStatementSortDirection,
  type FreightStatementSortMode,
  sortFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'
import { useModuleEditorItems } from '@/views/modules/use-module-editor-items'

interface Options {
  moduleKey: string
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  editorFormValues: Record<string, unknown>
  canManageItems: boolean
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
  const canManageCurrentItems = canManageItems && !parentImportedItemEditLocked
  const canAddManualItemsForCurrentRecord =
    canAddManualItems && !parentImportedItemEditLocked
  const canImportParentItems =
    Boolean(config.parentImport) &&
    !config.readOnly &&
    canSave &&
    !lineItemsLocked &&
    !parentImportedItemEditLocked
  const parentImportVisible = Boolean(
    config.parentImport &&
      (config.parentImport.visibleWhen?.(editorFormValues) ?? true),
  )
  // 附加费用 Tab：采购订单/销售订单/物流单启用
  const supportsExpenseTab =
    (moduleKey === 'purchase-order' ||
      moduleKey === 'sales-order' ||
      moduleKey === 'freight-bill') &&
    Boolean(config.itemColumns?.length)
  const canAutoSortItems =
    (moduleKey === 'sales-order' ||
      moduleKey === 'customer-statement' ||
      moduleKey === 'freight-statement') &&
    items.length > 1 &&
    !saving &&
    !lineItemsLocked

  const [freightStatementSortDirection, setFreightStatementSortDirection] =
    useState<FreightStatementSortDirection>('asc')
  // 导入上游后行序随上游：销售订单按商品资料规则，客户对账单按交货日期整理。
  const handleAutoSortItems = (mode?: FreightStatementSortMode) => {
    const effectiveMode = mode ?? 'sourceNo'
    setItems((current) =>
      moduleKey === 'customer-statement'
        ? sortCustomerStatementItemsByDeliveryDate(current)
        : moduleKey === 'freight-statement'
          ? sortFreightStatementItems(
              current,
              effectiveMode,
              effectiveMode === 'billTime'
                ? freightStatementSortDirection
                : 'asc',
            )
          : sortItemsByMaterialDefault(current),
    )
    if (moduleKey === 'freight-statement' && effectiveMode === 'billTime') {
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
