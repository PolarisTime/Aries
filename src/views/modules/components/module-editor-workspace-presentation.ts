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
     * 有明细区的模块（itemColumns 非空）不给表单区按钮：它们的取消/保存常驻在弹层
     * footer 槽里（见 resolveEditorShowsOverlayFooter），与明细页签无关。
     * 无明细区的模块（主数据式表单）才把按钮放在表单标题右侧。
     */
    formActionsVisible: !financeLayout && !config.itemColumns?.length,
    layoutVariant: financeLayout ? 'finance' : 'default',
  }
}

/**
 * 取消 / 保存 / 保存并审核是否渲染到 `WorkspaceOverlay` 的 footer 槽 —— **唯一来源**。
 *
 * <p>历史缺陷：这三个按钮曾挂在明细工具栏（`ModuleItemsToolbarActions`）里，而明细区
 * 的「货物明细 / 附加费用」两个页签是**互斥渲染**，切到「附加费用」就整条工具栏被卸载，
 * 保存入口一起消失（销售订单 / 采购订单 100% 复现，用户只能切回货物明细才能保存）。
 * 按 AGENTS.md《主数据表单与弹层排版规范》「取消 / 保存走 `WorkspaceOverlay` 的 `footer`
 * 槽固定在面板底部」，改为：</p>
 *
 * - 财务单据（收付款单）本来就是 footer 常驻，保持；
 * - 其余**有明细区**的模块也一律 footer 常驻，切任何页签都不会丢按钮；
 * - 无明细区的模块保持按钮在表单区（footer 为空），避免出现两条按钮。
 *
 * <p>判据只看「有没有明细区」，不看当前激活的页签 —— 页签是明细区内部状态，
 * 不该参与外壳是否渲染保存入口的决策。</p>
 */
export function resolveEditorShowsOverlayFooter(
  config: ModulePageConfig,
  moduleKey: string,
) {
  return (
    isFinanceDocumentModule(moduleKey) || Boolean(config.itemColumns?.length)
  )
}
