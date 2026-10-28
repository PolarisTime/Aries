/**
 * 行右键菜单里可能出现的动作目录 —— **唯一清单**。
 *
 * <p>菜单项只有两个来源，且都是固定词表，因此可以逐项配置：</p>
 * <ol>
 *   <li>行级动作：`useModuleRecordActions` 按固定 key 生成（查看 / 复制单号 / 编辑 /
 *       审核 / 反审核 / 确认核定 / 附件）；</li>
 *   <li>批量动作：勾选多行后追加（批量删除 / 批量审核 / 批量反审核 / 导出选中），
 *       见 `useModuleToolbarActions` 的 `SELECTION_SCOPED_ACTION_KEYS`。</li>
 * </ol>
 *
 * <p>页面自带的工具栏动作（打印、单据流、生成对账单…）不在行右键菜单里，因此不需要
 * 出现在这份目录中。新增行级或批量动作时**同时**在这里登记，否则个人设置里看不到它。</p>
 */
export interface ContextMenuActionDefinition {
  key: string
  /** 分组：行操作 / 批量操作（批量项只在勾选多行后出现）。 */
  group: 'row' | 'bulk'
  /** 个人设置里的通用叫法；审核/反审核在具体模块里的文案会随状态机变化，这里用通用名。 */
  labelKey: string
  /** 破坏性动作（删除等），在设置页给出提示。 */
  danger?: boolean
}

/** 行右键菜单动作目录；顺序即设置页里的展示顺序。 */
export const CONTEXT_MENU_ACTIONS: ContextMenuActionDefinition[] = [
  { key: 'detail', group: 'row', labelKey: 'contextMenuItem.detail' },
  { key: 'copy-doc-no', group: 'row', labelKey: 'contextMenuItem.copyDocNo' },
  { key: 'edit', group: 'row', labelKey: 'contextMenuItem.edit' },
  { key: 'audit', group: 'row', labelKey: 'contextMenuItem.audit' },
  {
    key: 'reverse-audit',
    group: 'row',
    labelKey: 'contextMenuItem.reverseAudit',
  },
  {
    key: 'confirm-delivery-verification',
    group: 'row',
    labelKey: 'contextMenuItem.confirmDeliveryVerification',
  },
  { key: 'attach', group: 'row', labelKey: 'contextMenuItem.attach' },
  {
    key: 'export_selected',
    group: 'bulk',
    labelKey: 'contextMenuItem.exportSelected',
  },
  { key: 'bulk_audit', group: 'bulk', labelKey: 'contextMenuItem.bulkAudit' },
  {
    key: 'bulk_reverse_audit',
    group: 'bulk',
    labelKey: 'contextMenuItem.bulkReverseAudit',
  },
  {
    key: 'bulk_delete',
    group: 'bulk',
    labelKey: 'contextMenuItem.bulkDelete',
    danger: true,
  },
]

/** 目录里某一分组的全部 key（用于"恢复默认""按组关闭"等批量操作）。 */
export function contextMenuActionKeysByGroup(group: 'row' | 'bulk'): string[] {
  return CONTEXT_MENU_ACTIONS.filter((action) => action.group === group).map(
    (action) => action.key,
  )
}

/** 某项是否被用户隐藏（缺省显示：只有显式列在 hiddenActionKeys 里才隐藏）。 */
export function isContextMenuActionHidden(
  hiddenActionKeys: readonly string[] | undefined,
  actionKey: string | undefined,
): boolean {
  if (!actionKey || !hiddenActionKeys?.length) return false
  return hiddenActionKeys.includes(actionKey)
}
