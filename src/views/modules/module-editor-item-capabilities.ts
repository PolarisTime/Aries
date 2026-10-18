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

export interface ModuleItemReorderCapabilityOptions {
  moduleKey: string
  /** 能管理明细(调用方已收窄只读/保存中)。 */
  canManageItems: boolean
  /**
   * 上游导入锁定。
   *
   * <p><b>刻意不参与判定</b>, 只作为入参留痕, 让"哪些开关被考虑过"在类型上可见:
   * 导入态已经允许「删除选中行」(删除即把该行占用的来源数量释放回来源单),
   * 行序管理与它同级 —— 一个能删行的表不允许换行顺序在语义上说不通。</p>
   */
  parentImportedItemEditLocked?: boolean
  /**
   * 单据是否处于「明细行锁定」态(如销售订单的交付核定)。
   *
   * <p><b>刻意不参与判定</b>: 明细行锁定锁的是**行内字段值**(销售订单锁 `unitPrice`
   * 等白名单列), 而拖动排序只重排数组下标、不改任何字段值, 服务端按
   * `line_no = 下标 + 1` 重编。把两者绑在同一个开关上会让「交付核定」状态连行序
   * 都不能调 —— 这正是用户报的问题。</p>
   *
   * <p>保留为入参只是留痕: 让"哪些开关被考虑过"在类型上可见。</p>
   */
  lineItemsLocked?: boolean
}

/**
 * 明细行序(整行长按拖动)是否可用。
 *
 * <p>三个理由说明为什么把行序从"上游导入锁定"里摘出来:</p>
 * <ol>
 *   <li>拖动**不改任何导入字段值与来源分配**: 只重排数组, 服务端按
 *       `line_no = 下标 + 1` 重编号, 分配量与来源关系一个都不动;</li>
 *   <li>导入态**已经允许「删除选中行」**(`allowsItemRemovalWhenParentImported`),
 *       行序管理与之同级, 不该比删行更受限;</li>
 *   <li>用户诉求就是"销售订单编辑允许拖动行位置" —— 而销售订单明细只能来自上游导入,
 *       若沿用"导入即禁拖", 这条诉求在销售订单上等于永远不成立。</li>
 * </ol>
 *
 * <p>仍然尊重模块的**设计性**禁拖: 物流单/运费对账单由 `disablesItemReorder` 关闭
 * (它们的行序由上游单据/项目分组决定)。要回到"上游顺序"用工具栏的「自动排序」。</p>
 *
 * <p><b>与「明细行锁定」解耦</b>: 单据进入交付核定等锁定态时, 锁的是行内字段值
 * (销售订单锁 `unitPrice` 等白名单列), 而拖动只重排数组下标 —— 两者不是一回事。
 * 因此本判定只看「能不能管理明细的**行集合**」与「模块是否设计性禁拖」,
 * 不看 `lineItemsLocked`。详见 {@link ModuleItemReorderCapabilityOptions.lineItemsLocked}。</p>
 */
export function canReorderModuleEditorItems({
  moduleKey,
  canManageItems,
}: ModuleItemReorderCapabilityOptions): boolean {
  return (
    canManageItems &&
    !getModuleEditorItemBehavior(moduleKey)?.disablesItemReorder
  )
}
