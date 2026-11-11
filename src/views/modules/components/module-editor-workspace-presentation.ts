import type { ModulePageConfig } from '@/types/module-page'

/**
 * ModuleEditorWorkspace 的纯派生计算。
 *
 * <p>抽出原因：编辑器外壳里散落着「客户 id 取值」「财务单据布局开关」「是否自动
 * 插入空明细行」「会话 recordId 透传」四类判断，内联后本组件的控制流复杂度
 * 越过 react-doctor 阈值 (no-high-complexity-react-function)。它们都不依赖
 * React，只是把 props/配置映射成渲染与 hook 入参，因此集中成纯函数。</p>
 */

const FINANCE_DOCUMENT_MODULES = new Set(['receipt', 'payment'])

/** 收付款单使用财务版布局(整页脚注 + 隐藏明细区页脚按钮)。 */
export function isFinanceDocumentModule(moduleKey: string) {
  return FINANCE_DOCUMENT_MODULES.has(moduleKey)
}

/**
 * 客户下拉的当前客户 id：useWatch 的值是 unknown，只有非空字符串才算选中客户。
 */
export function resolveEditorCustomerId(watchedCustomerId: unknown) {
  return typeof watchedCustomerId === 'string' && watchedCustomerId
    ? watchedCustomerId
    : undefined
}

/** 新建且模块支持手输明细行时自动补一条空行, 让用户直接开始录入。 */
export function shouldAutoInsertBlankItemOnCreate(
  config: ModulePageConfig,
  canAddManualItems: boolean,
) {
  return Boolean(config.itemColumns?.length) && canAddManualItems
}

/** 只有已落库的草稿才把 recordId 带进编辑会话, 新建会话不带。 */
export function resolveEditorSessionIds(
  record: { id?: unknown } | null | undefined,
) {
  return record?.id ? { recordId: String(record.id) } : {}
}

export interface EditorPresentation {
  /** 财务版布局: 弹层类名 / 表单区操作 / 布局变体三处的同一开关。 */
  financeLayout: boolean
  formActionsVisible: boolean
  /**
   * 保存组是否渲染到弹层 footer 槽（与之互斥地渲染在明细工具栏）。
   * 与 {@link resolveEditorShowsOverlayFooter} 同源，在此一并给出，
   * 避免调用方为同一判据再加一次计算。
   */
  overlayFooterVisible: boolean
  layoutVariant: 'finance' | 'default'
  overlayClassName: string | undefined
}

/** 财务版布局在 JSX 上的投影: 集中一次判断, 避免同一条件散成多个三元。 */
export function resolveEditorPresentation(
  config: ModulePageConfig,
  moduleKey: string,
): EditorPresentation {
  const financeLayout = isFinanceDocumentModule(moduleKey)
  return {
    financeLayout,
    overlayClassName: financeLayout
      ? 'workspace-overlay-panel--finance-editor'
      : undefined,
    /*
     * 财务布局（收付款单）不给表单区按钮：它们的取消/保存常驻在弹层 footer 槽里。
     * 其余有明细区的模块把按钮放在明细工具栏（见 resolveEditorShowsOverlayFooter），
     * 由明细区在「货物明细 / 附加费用」两个页签都渲染工具栏来保证不丢入口。
     * 无明细区的模块（主数据式表单）才把按钮放在表单标题右侧。
     */
    formActionsVisible: !financeLayout && !config.itemColumns?.length,
    overlayFooterVisible: resolveEditorShowsOverlayFooter(moduleKey),
    layoutVariant: financeLayout ? 'finance' : 'default',
  }
}

/**
 * 取消 / 保存 / 保存并审核是否渲染到 `WorkspaceOverlay` 的 footer 槽 —— **唯一来源**。
 *
 * <p>历史缺陷：这三个按钮曾挂在明细工具栏（`ModuleItemsToolbarActions`）里，而明细区
 * 的「货物明细 / 附加费用」两个页签是**互斥渲染**，切到「附加费用」就整条工具栏被卸载，
 * 保存入口一起消失（销售订单 / 采购订单 100% 复现，用户只能切回货物明细才能保存）。
 * 当时的修法是把按钮整体提升到弹层 footer 槽常驻。</p>
 *
 * <p>现在按用户使用习惯改回**明细工具栏**，但要保住「任何页签都有保存入口」这个不变量，
 * 于是把保证方式从「挪到 footer」换成「两个页签渲染同一条工具栏」：</p>
 *
 * - 财务单据（收付款单）保持 footer 常驻，与原状一致；
 * - 其余**有明细区**的模块把按钮放回明细工具栏，且 `ModuleEditorItemsSection` 在两个页签
 *   都渲染工具栏（见该组件 `showFooterActions` 的说明）；
 * - 无明细区的模块保持按钮在表单区（footer 为空），避免出现两条按钮。
 *
 * <p>判据只看「有没有明细区」，不看当前激活的页签 —— 页签是明细区内部状态，
 * 不该参与外壳是否渲染保存入口的决策。</p>
 */
export function resolveEditorShowsOverlayFooter(moduleKey: string) {
  return isFinanceDocumentModule(moduleKey)
}
