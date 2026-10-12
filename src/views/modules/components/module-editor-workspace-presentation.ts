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
  /** 财务版布局: 弹层类名 / 脚注按钮 / 表单区操作 / 布局变体四处的同一开关。 */
  financeLayout: boolean
  formActionsVisible: boolean
  layoutVariant: 'finance' | 'default'
  overlayClassName: string | undefined
  showFooterActions: boolean
}

/** 财务版布局在四处 JSX 上的投影: 集中一次判断, 避免同一条件散成三个三元。 */
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
    showFooterActions: financeLayout,
    formActionsVisible: !financeLayout && !config.itemColumns?.length,
    layoutVariant: financeLayout ? 'finance' : 'default',
  }
}
