import type { ModulePageConfig } from '@/types/module-page'
import { getModuleEditorItemBehavior } from '@/views/modules/module-editor-item-behaviors'

export interface ModuleEditorItemCapabilityOptions {
  moduleKey: string
  config: ModulePageConfig
  /** 上游导入锁定（存在父单号且模块声明了导入后仍可编辑的字段/列）。 */
  parentImportedItemEditLocked: boolean
  /** 当前明细是否有行；导入行被全部删除后行区回到未导入状态。 */
  hasItems: boolean
  canManageItems: boolean
  canAddManualItems: boolean
  canSave: boolean
  lineItemsLocked: boolean
}

export interface ModuleEditorItemCapabilities {
  /** 原始上游导入锁定：字段/列的编辑口径不变。 */
  parentImportedItemEditLocked: boolean
  /** 行区锁定：仅当上游导入且仍有明细行时生效。 */
  parentImportedItemAreaLocked: boolean
  /** 上游导入锁定后是否仍放行「选择 + 删除选中」。 */
  parentImportedItemRemovalUnlocked: boolean
  canManageCurrentItems: boolean
  canAddManualItemsForCurrentRecord: boolean
  canImportParentItems: boolean
}

/**
 * 明细区能力解析：把「编辑锁定」与「删除入口」拆开。
 *
 * <p>上游导入锁定（<code>parentImportedItemEditLocked</code>）此前被同时用于编辑与明细管理，
 * 导致导入采购来源后管理列与「删除选中」一起消失，用户没有任何删除入口。行为表里声明
 * <code>allowsItemRemovalWhenParentImported</code> 的模块（销售订单）在锁定态下仍保留删除，
 * 编辑快照列、手工新增与再次导入仍按锁定口径禁用。</p>
 *
 * <p>行全部删除后行区不再锁定：已分配来源数量全部释放，允许重新选择上游单据导入；
 * 但手工新增行仍被禁用——销售订单明细必须来源于采购来源，手工行保存必然被后端拒绝。</p>
 */
export function resolveModuleEditorItemCapabilities({
  moduleKey,
  config,
  parentImportedItemEditLocked,
  hasItems,
  canManageItems,
  canAddManualItems,
  canSave,
  lineItemsLocked,
}: ModuleEditorItemCapabilityOptions): ModuleEditorItemCapabilities {
  const allowsItemRemovalWhenParentImported =
    getModuleEditorItemBehavior(moduleKey)
      ?.allowsItemRemovalWhenParentImported === true
  const parentImportedItemAreaLocked = parentImportedItemEditLocked && hasItems
  const parentImportedItemRemovalUnlocked =
    parentImportedItemEditLocked && allowsItemRemovalWhenParentImported

  return {
    parentImportedItemEditLocked,
    parentImportedItemAreaLocked,
    parentImportedItemRemovalUnlocked,
    canManageCurrentItems:
      canManageItems &&
      (!parentImportedItemEditLocked || parentImportedItemRemovalUnlocked),
    canAddManualItemsForCurrentRecord:
      canAddManualItems && !parentImportedItemEditLocked,
    canImportParentItems:
      Boolean(config.parentImport) &&
      !config.readOnly &&
      canSave &&
      !lineItemsLocked &&
      !parentImportedItemAreaLocked,
  }
}
