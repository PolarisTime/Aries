// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'

/**
 * 编辑器「忙态」统一锁：保存 / 保存并审核 / 取消 / Ctrl+S 与上游导入共用同一把
 * in-flight 锁。
 *
 * <p>历史缺陷：导入进行中仍可保存，保存载荷取自导入前的 items，服务端先落一份
 * 「没有导入行」的单据；导入随后完成又置脏，用户以为已保存却还要再存一次。</p>
 */

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

const runtime = vi.hoisted(() => ({
  saving: false,
  parentImporting: false,
  importPromise: null as null | Promise<void>,
  /** 保存组（明细工具栏行末）的 saving（唯一出口） */
  saveGroupSaving: [] as boolean[],
  overlayFooterRendered: false,
  shortcutSaving: [] as boolean[],
  itemsAreaSaving: [] as boolean[],
  importRecords: null as
    | null
    | ((records: ModuleRecord[]) => void | Promise<void>),
}))

const items = [{ id: '11', amount: 100 }] as unknown as ModuleLineItem[]

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
    handleImportParentRecord: () => runtime.importPromise ?? Promise.resolve(),
    handleFormValuesChange: () => {},
    handleSave: () => {},
    isEdit: false,
    items,
    openParentSelector: () => {},
    parentImporting: runtime.parentImporting,
    parentSelectorDisplayFieldKey: '',
    parentSelectorFilters: {},
    parentSelectorModuleKey: '',
    parentSelectorOpen: false,
    authoritativePrimaryNo: '',
    saveResult: null,
    reloadAfterConflict: () => {},
    saving: runtime.saving,
    setItems: () => {},
    expenseItems: [],
    updateExpenseItems: () => {},
  }),
}))

vi.mock('@/views/modules/use-module-editor-capability-flags', () => ({
  useModuleEditorCapabilityFlags: () => ({
    canAddManualItems: false,
    canEditItemColumns: false,
    canManageItems: false,
    canReorderItems: false,
    canSaveAndAuditInEditor: true,
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
    canImportParentItems: true,
    freightStatementSortDirection: 'asc',
    handleAutoSortItems: () => {},
    parentImportVisible: true,
    supportsExpenseTab: false,
    clearSelectedItems: vi.fn(),
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
  useEditorSaveShortcuts: (options: { saving: boolean }) => {
    runtime.shortcutSaving.push(options.saving)
  },
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({
    children,
    footer,
  }: {
    children?: ReactNode
    footer?: ReactNode
  }) => {
    runtime.overlayFooterRendered = footer !== undefined
    return createElement('div', { 'data-testid': 'overlay' }, footer, children)
  },
}))

vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: (props: { saving: boolean }) => {
    runtime.saveGroupSaving.push(props.saving)
    return createElement('div', { 'data-testid': 'footer' })
  },
}))

vi.mock('./ModuleEditorFormArea', () => ({
  ModuleEditorFormArea: () =>
    createElement('div', { 'data-testid': 'form-area' }),
}))

vi.mock('./ModuleEditorItemsArea', () => ({
  ModuleEditorItemsArea: (props: {
    saving: boolean
    onImportParentRecord: (records: ModuleRecord[]) => void | Promise<void>
  }) => {
    runtime.itemsAreaSaving.push(props.saving)
    runtime.importRecords = props.onImportParentRecord
    return createElement('div', { 'data-testid': 'items-area' })
  },
}))

vi.mock('./ModuleEditorSaveResultHost', () => ({
  ModuleEditorSaveResultHost: () => null,
}))

import { ModuleEditorWorkspace } from './ModuleEditorWorkspace'

const config: ModulePageConfig = {
  key: 'sales-order',
  title: '销售订单',
  data: [],
  columns: [],
  detailFields: [],
  formFields: [],
  itemColumns: [],
  detailItemColumns: [],
  pageActions: [],
} as unknown as ModulePageConfig

describe('ModuleEditorWorkspace 忙态锁', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    runtime.saving = false
    runtime.parentImporting = false
    runtime.importPromise = null
    runtime.saveGroupSaving = []
    runtime.overlayFooterRendered = false
    runtime.shortcutSaving = []
    runtime.itemsAreaSaving = []
    runtime.importRecords = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderWorkspace = (moduleKey: 'sales-order' | 'receipt') => {
    act(() => {
      root.render(
        createElement(ModuleEditorWorkspace as never, {
          open: true,
          config: { ...config, key: moduleKey },
          record: null,
          initialParentImportSource: null,
          moduleKey,
          canSave: true,
          canAudit: true,
          canCreateAnother: false,
          onClose: () => {},
          onSaved: () => {},
          onCreateAnother: () => {},
        }),
      )
    })
  }

  const last = (values: boolean[]) => values[values.length - 1]

  it('空闲态：两条保存路径与快捷键都不被锁', () => {
    renderWorkspace('sales-order')

    expect(last(runtime.itemsAreaSaving)).toBe(false)
    expect(last(runtime.shortcutSaving)).toBe(false)
  })

  /*
   * 单据级动作的出口按模块分两类（见 resolveEditorShowsOverlayFooter）：
   * - 采购 / 销售 / 物流 → 明细工具栏的行末槽（弹层 footer 为空）；
   * - 收付款单 → 仍走弹层 footer，与原状一致。
   */
  it('明细工具栏路径（销售订单）：导入中锁住保存组与 Ctrl+S', () => {
    runtime.parentImporting = true
    renderWorkspace('sales-order')

    // 明细工具栏行末的保存组走同一把锁（保存/保存并审核/取消一起禁用）：
    // 保存组由明细区渲染，因此断言落在明细区收到的 saving 上
    expect(runtime.overlayFooterRendered).toBe(false)
    expect(last(runtime.itemsAreaSaving)).toBe(true)
    // 快捷键只在 saving 为真时忽略本次 Ctrl+S
    expect(last(runtime.shortcutSaving)).toBe(true)
  })

  it('弹层 footer 路径（收付款单）：不受明细工具栏影响，保存组仍被锁', () => {
    runtime.parentImporting = true
    renderWorkspace('receipt')

    // 收付款单不走明细工具栏：footer 照旧渲染
    expect(runtime.overlayFooterRendered).toBe(true)
    expect(last(runtime.saveGroupSaving)).toBe(true)
    expect(last(runtime.shortcutSaving)).toBe(true)
  })

  it('保存中：与导入共用同一把锁（行为不变）', () => {
    runtime.saving = true
    renderWorkspace('sales-order')

    expect(last(runtime.itemsAreaSaving)).toBe(true)
    expect(last(runtime.shortcutSaving)).toBe(true)
  })

  it('导入回调返回 Promise，供选单弹层等待回填完成后再关闭', () => {
    runtime.importPromise = Promise.resolve()
    renderWorkspace('sales-order')

    expect(runtime.importRecords).not.toBeNull()
    let result!: void | Promise<void>
    act(() => {
      result = runtime.importRecords?.([
        { id: '5001', orderNo: 'PO-1' },
      ] as ModuleRecord[])
    })
    // 必须把 controller 的 Promise 透传上去，否则弹层会立即 onClose
    expect(result).toBeInstanceOf(Promise)
  })
})
