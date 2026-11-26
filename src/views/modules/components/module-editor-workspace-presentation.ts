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
   * 保存组是否渲染到弹层 footer 槽（与之互斥地渲染在明细工具栏或表单顶栏）。
   * 与 {@link resolveEditorShowsOverlayFooter} 同源，在此一并给出，
   * 避免调用方为同一判据再加一次计算。
   */
  overlayFooterVisible: boolean
  /**
   * 启用 `formSteps` 且无明细区的模块（项目资料、物流商、收付款单）：
   * 统一由弹层固定 footer 承载「步骤进度 + 上一步 / 下一步 + 取消 / 保存」，
   * 消除表单顶栏与向导底部两排按钮分裂及双主按钮冲突。
   */
  wizardFooterVisible: boolean
  layoutVariant: 'finance' | 'default'
  overlayClassName: string | undefined
}

export interface EditorPresentationOptions {
  /**
   * 个人设置里的「单据动作按钮位置」。
   *
   * <p>`top`（默认）= 明细列表工具栏右侧；`bottom` = 弹层 footer 槽（右下角常驻）。
   * 由 `useUiSettingsStore` 的 `editorActionPlacement` 提供，属于**用户偏好**，
   * 因此不写进各模块的页面配置。</p>
   */
  actionPlacement?: 'top' | 'bottom'
}

function usesWizardOverlayFooter(
  config?: Pick<ModulePageConfig, 'formSteps' | 'itemColumns'>,
) {
  return Boolean(config?.formSteps?.length) && !config?.itemColumns?.length
}

/** 财务版布局与向导底栏在 JSX 上的投影: 集中一次判断, 避免同一条件散成多个三元。 */
export function resolveEditorPresentation(
  config: ModulePageConfig,
  moduleKey: string,
  options: EditorPresentationOptions = {},
): EditorPresentation {
  const financeLayout = isFinanceDocumentModule(moduleKey)
  const wizardFooterVisible = usesWizardOverlayFooter(config)
  /*
   * 用户把按钮位置设成「底部」时，等价于财务单据那种常驻 footer 的形态：
   * 无论有没有明细区、当前在哪个页签，保存入口都在右下角，不会被滚动或页签切走。
   */
  const bottomActions = options.actionPlacement === 'bottom'
  return {
    financeLayout,
    overlayClassName: financeLayout
      ? 'workspace-overlay-panel--finance-editor'
      : undefined,
    /*
     * 财务布局（收付款单）与启用向导的无明细模块（项目资料 / 物流商）不给表单区顶部按钮：
     * 它们的向导导航与取消/保存统一收口在弹层 footer 槽里。
     * 其余有明细区的模块把按钮放在明细工具栏（见 resolveEditorShowsOverlayFooter），
     * 由明细区在「货物明细 / 附加费用」两个页签都渲染工具栏来保证不丢入口。
     * 无明细区且未启用向导的模块才把按钮放在表单标题右侧。
     * 用户选了「底部」时，以上位置一律让位给 footer，避免出现两条按钮。
     */
    formActionsVisible:
      !financeLayout &&
      !wizardFooterVisible &&
      !config.itemColumns?.length &&
      !bottomActions,
    overlayFooterVisible:
      resolveEditorShowsOverlayFooter(moduleKey, config) || bottomActions,
    wizardFooterVisible,
    layoutVariant: financeLayout ? 'finance' : 'default',
  }
}

/**
 * 取消 / 保存 / 保存并审核是否渲染到 `WorkspaceOverlay` 的 footer 槽 —— **唯一来源**。
 *
 * <p>口径：</p>
 * - 财务单据（收付款单）保持 footer 常驻；
 * - 启用 `formSteps` 的无明细模块（项目资料 / 物流商等）由 footer 统一承载向导导航与保存按钮；
 * - 其余**有明细区**的模块把按钮放回明细工具栏，且 `ModuleEditorItemsSection` 在两个页签
 *   都渲染工具栏；
 * - 无明细区且非向导的模块保持按钮在表单区（footer 为空），避免出现两条按钮。
 */
export function resolveEditorShowsOverlayFooter(
  moduleKey: string,
  config?: Pick<ModulePageConfig, 'formSteps' | 'itemColumns'>,
) {
  return isFinanceDocumentModule(moduleKey) || usesWizardOverlayFooter(config)
}
