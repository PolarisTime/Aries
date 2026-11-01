// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ModuleEditorExtrasContext,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'

/**
 * 编辑器附加节点（`ModulePageConfig.renderEditorExtras`）的挂载契约。
 *
 * <p>销售订单的「项目数据」面板依赖这个扩展点：它必须在**表单区之后、明细区之前**渲染，
 * 否则面板读不到刚录入的项目/明细（或会被明细区的重渲染不断卸载重挂）。这里是整个
 * 编辑器链路里唯一强制校验挂载顺序的用例 —— 通用编辑器组件不需要知道「项目数据」这件事。</p>
 */

// ── 边界媒体/hook 打桩（编辑器外壳会拉起 master 选项、取价、会话等重依赖） ──
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

const items = [
  { id: '11', amount: 100, weightTon: 1 },
  { id: '12', amount: 200, weightTon: 2 },
] as unknown as ModuleLineItem[]
const expenseItems = [{ chargeName: '运费', amount: 30 }]

vi.mock('@/hooks/useMasterOptions', () => ({
  useMasterOptions: () => ({ projects: [] }),
  resolveMasterOptionRequirements: () => ({}),
}))

vi.mock('@/layouts/editor-session/EditorSessionGuard', () => ({
  useEditorSession: () => ({
    beginSession: () => {},
    endSession: () => {},
    requestClose: (onClose: () => void) => onClose(),
    setSessionStatus: () => {},
  }),
}))

vi.mock('@/views/modules/use-module-editor-workspace', () => ({
  useModuleEditorWorkspace: () => ({
    addItem: () => {},
    clearSaveResult: () => {},
    closeParentSelector: () => {},
    handleImportParentRecord: () => {},
    handleFormValuesChange: () => {},
    handleSave: () => {},
    isEdit: false,
    items,
    openParentSelector: () => {},
    parentImporting: false,
    parentSelectorDisplayFieldKey: '',
    parentSelectorFilters: {},
    parentSelectorModuleKey: '',
    parentSelectorOpen: false,
    authoritativePrimaryNo: '',
    saveResult: null,
    reloadAfterConflict: () => {},
    saving: false,
    setItems: () => {},
    expenseItems,
    updateExpenseItems: () => {},
  }),
}))

vi.mock('@/views/modules/use-module-editor-capability-flags', () => ({
  useModuleEditorCapabilityFlags: () => ({
    canAddManualItems: false,
    canEditItemColumns: false,
    canManageItems: false,
    canReorderItems: false,
    canSaveAndAuditInEditor: false,
    currentStatus: '草稿',
    editorAuditActionKind: 'audit',
    editorAuditLabel: '保存并审核',
    editorAuditTarget: null,
  }),
}))

vi.mock('@/views/modules/use-module-editor-item-controls', () => ({
  useModuleEditorItemControls: () => ({
    canAddManualItemsForCurrentRecord: false,
    canAutoSortItems: false,
    canImportParentItems: false,
    freightStatementSortDirection: 'none',
    handleAutoSortItems: () => {},
    parentImportVisible: false,
    supportsExpenseTab: true,
    clearSelectedItems: () => {},
    handleRowReorder: () => {},
    itemColumns: [],
    itemTableComponents: {},
    itemColumnOrder: [],
    itemRowMenus: [],
    onItemColumnOrderChange: () => {},
    removeSelectedItems: () => {},
    selectedItemIds: [],
    toggleItemColumn: () => {},
    visibleItemColumnKeys: [],
  }),
}))

vi.mock('@/views/modules/use-module-editor-expense-items', () => ({
  useModuleEditorExpenseItems: () => ({}),
}))

vi.mock('@/views/modules/use-module-editor-settlement-accounts', () => ({
  useModuleEditorSettlementAccounts: () => [],
}))

vi.mock('@/views/modules/use-confirmed-item-removal', () => ({
  useConfirmedItemRemoval: () => () => {},
  restoreRemovedItems: (current: unknown) => current,
}))

vi.mock('@/views/modules/use-editor-save-shortcuts', () => ({
  useEditorSaveShortcuts: () => {},
}))

// 只保留外壳：表单区/明细区/保存回执用标记节点替代，避免把 antd 大表格拉进用例。
vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({
    children,
    footer,
  }: {
    children?: ReactNode
    footer?: ReactNode
  }) => createElement('div', { 'data-testid': 'overlay' }, footer, children),
}))
vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: () => createElement('div', { 'data-testid': 'footer' }),
}))
vi.mock('./ModuleEditorFormArea', () => ({
  ModuleEditorFormArea: () =>
    createElement('div', { 'data-testid': 'form-area' }),
}))
vi.mock('./ModuleEditorItemsArea', () => ({
  ModuleEditorItemsArea: () =>
    createElement('div', { 'data-testid': 'items-area' }),
}))
vi.mock('./ModuleEditorSaveResultHost', () => ({
  ModuleEditorSaveResultHost: () => null,
}))

import { ModuleEditorExtras } from './ModuleEditorExtras'
import { ModuleEditorWorkspace } from './ModuleEditorWorkspace'

const buildConfig = (
  extras?: ModulePageConfig['renderEditorExtras'],
): ModulePageConfig => ({
  key: 'sales-order',
  title: '销售订单',
  kicker: '销售',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  itemColumns: [{ title: '仓库名称', dataIndex: 'warehouseName' }],
  data: [],
  statusMap: {},
  buildOverview: () => [],
  ...(extras ? { renderEditorExtras: extras } : {}),
})

describe('编辑器附加节点 renderEditorExtras', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderNode = (node: ReactNode) =>
    act(() => {
      root.render(node)
    })

  it('编辑器在表单区之后、明细区之前挂载附加节点', () => {
    const extras = vi.fn((_context: ModuleEditorExtrasContext) =>
      createElement('span', { 'data-testid': 'editor-extras' }),
    )
    renderNode(
      createElement(ModuleEditorWorkspace, {
        open: true,
        config: buildConfig(extras),
        record: null,
        initialParentImportSource: null,
        moduleKey: 'sales-order',
        canSave: true,
        canAudit: false,
        canCreateAnother: false,
        onClose: () => {},
        onSaved: () => {},
        onCreateAnother: () => {},
      }),
    )

    // 挂载点每次渲染都会调用配置（与会话状态变化引起的重渲染同频），因此只断言"被调用过"，
    // 并以最后一次调用的上下文为准。
    expect(extras).toHaveBeenCalled()
    const context = extras.mock.calls.at(-1)?.[0]
    if (!context) throw new Error('renderEditorExtras 未收到上下文')
    expect(context.items).toBe(items)
    expect(context.expenseItems).toBe(expenseItems)
    expect(typeof context.form?.getFieldsValue).toBe('function')
    expect(context.record).toMatchObject({ items })

    const marker = container.querySelector('[data-testid="editor-extras"]')
    expect(marker).not.toBeNull()

    // 顺序契约：form-area → extras → items-area
    const formArea = container.querySelector('[data-testid="form-area"]')
    const itemsArea = container.querySelector('[data-testid="items-area"]')
    expect(formArea).not.toBeNull()
    expect(itemsArea).not.toBeNull()
    expect(
      formArea!.compareDocumentPosition(marker!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      marker!.compareDocumentPosition(itemsArea!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('未声明附加节点的模块保持原样（不渲染多余节点）', () => {
    renderNode(
      createElement(ModuleEditorWorkspace, {
        open: true,
        config: buildConfig(undefined),
        record: null,
        initialParentImportSource: null,
        moduleKey: 'sales-order',
        canSave: true,
        canAudit: false,
        canCreateAnother: false,
        onClose: () => {},
        onSaved: () => {},
        onCreateAnother: () => {},
      }),
    )

    expect(container.querySelector('[data-testid="form-area"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="items-area"]')).not.toBeNull()
  })

  it('上下文里的 record 是「持久化字段 + 实时表单值 + 明细行」的合并视图', () => {
    const extras = vi.fn((_context: ModuleEditorExtrasContext) => null)
    const persisted = {
      id: '9007199254740995',
      orderNo: 'SO-OLD',
      projectId: '9007199254740993',
    } as unknown as ModuleRecord

    renderNode(
      createElement(ModuleEditorExtras, {
        config: buildConfig(extras),
        record: persisted,
        form: { getFieldsValue: () => ({}) } as never,
        // 实时表单值里项目已被改成另一个项目：编辑器应以实时值为准
        formValues: { projectId: '9007199254740994' },
        items,
        expenseItems,
      }),
    )

    const context = extras.mock.calls[0]?.[0]
    expect(context.record).toMatchObject({
      id: '9007199254740995',
      orderNo: 'SO-OLD',
      projectId: '9007199254740994',
      items,
    })
  })
})
