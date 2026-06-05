import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { useModuleToolbarActions } from './useModuleToolbarActions'

const baseConfig: ModulePageConfig = {
  key: 'sales-order',
  title: '',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
}

const warningMock = vi.fn()
const infoMock = vi.fn()
const resolveModuleActionKindMock = vi.fn()

vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: (...args: unknown[]) => warningMock(...args),
    info: (...args: unknown[]) => infoMock(...args),
    success: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/module-system/module-adapter-actions', async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import('@/module-system/module-adapter-actions')
    >()
  return {
    ...original,
    resolveModuleActionKind: (
      ...args: Parameters<typeof original.resolveModuleActionKind>
    ) =>
      resolveModuleActionKindMock(...args) ??
      original.resolveModuleActionKind(...args),
  }
})

function createHandlers() {
  return {
    exportMaterialRows: vi.fn().mockResolvedValue(undefined),
    exportRows: vi.fn().mockResolvedValue(undefined),
    handleSelectedAuditRecords: vi.fn(),
    handleSelectedDeleteRecords: vi.fn(),
    handleSelectedReverseAuditRecords: vi.fn(),
    markSelectedFreightDelivered: vi.fn(),
    navigateToRoleActionEditor: vi.fn(),
    openCreateEditor: vi.fn().mockResolvedValue(undefined),
    openCustomerStatementGenerator: vi.fn(),
    openFreightPickupList: vi.fn(),
    openFreightStatementGenerator: vi.fn(),
    openFreightSummary: vi.fn().mockResolvedValue(undefined),
    openSupplierStatementGenerator: vi.fn(),
  }
}

describe('useModuleToolbarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveModuleActionKindMock.mockReset()
  })

  it('keeps batch audit actions in the list toolbar', () => {
    const handlers = createHandlers()

    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: true,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    expect(
      result.current.visibleToolbarActions.map((item) => item.label),
    ).toEqual([
      'hooks.toolbarActions.audit',
      'hooks.toolbarActions.reverseAudit',
    ])

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
      void result.current.handleAction(result.current.visibleToolbarActions[1])
    })

    expect(handlers.handleSelectedAuditRecords).toHaveBeenCalledTimes(1)
    expect(handlers.handleSelectedReverseAuditRecords).toHaveBeenCalledTimes(1)
  })

  it('does not add duplicate print preview or direct print toolbar buttons', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    expect(
      result.current.visibleToolbarActions.map((item) => item.label),
    ).toEqual([])
  })

  it('includes bulk delete action when canUseBulkDeleteActions is true', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 2,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: true,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    expect(
      result.current.visibleToolbarActions.map((item) => item.label),
    ).toEqual(['hooks.toolbarActions.delete'])
  })

  it('disables delete when no rows selected', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: true,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    expect(result.current.visibleToolbarActions[0]?.disabled).toBe(true)
  })

  it('disables actions when no rows selected', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: true,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    for (const action of result.current.visibleToolbarActions) {
      expect(action.disabled).toBe(true)
    }
  })

  it('filters actions by permission', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [{ key: 'create', label: '新增订单', type: 'primary' }],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => false,
        handlers: createHandlers(),
      }),
    )

    expect(result.current.visibleToolbarActions).toHaveLength(0)
  })

  it('calls handlers for various action kinds', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue(
      'openCustomerStatementGenerator',
    )
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'generate_statement', label: '生成对账单', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openCustomerStatementGenerator).toHaveBeenCalled()
  })

  it('calls handler for freight statement generator', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('openFreightStatementGenerator')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'freight_stmt', label: '运费对账单', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openFreightStatementGenerator).toHaveBeenCalled()
  })

  it('calls handler for supplier statement generator', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue(
      'openSupplierStatementGenerator',
    )
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'supplier_stmt', label: '供应商对账单', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openSupplierStatementGenerator).toHaveBeenCalled()
  })

  it('calls handler for freight pickup list', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('openFreightPickupList')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [{ key: 'pickup', label: '提货清单', type: 'default' }],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openFreightPickupList).toHaveBeenCalled()
  })

  it('calls handler for freight summary', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('openFreightSummary')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'freight_summary', label: '运费汇总', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openFreightSummary).toHaveBeenCalled()
  })

  it('calls handler for navigate to role action editor', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('navigateToRoleActionEditor')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'role_editor', label: '角色动作编辑器', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.navigateToRoleActionEditor).toHaveBeenCalled()
  })

  it('creates pinned generate_pickup_list action with disabled state when selectedRowCount is 0', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('none')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            {
              key: 'generate_pickup_list',
              label: '生成提货清单',
              type: 'default',
            },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    expect(result.current.visibleToolbarActions[0]?.disabled).toBe(true)
  })

  it('shows warning for no permission action', () => {
    const handlers = createHandlers()
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => false,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction({
        label: 'some action',
        type: 'default',
      } as any)
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.toolbarActions.noPermission',
    )
  })

  it('handles delete action from handleAction', () => {
    const handlers = createHandlers()
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: true,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.handleSelectedDeleteRecords).toHaveBeenCalled()
  })

  it('handles exportRows action', () => {
    const handlers = createHandlers()
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [{ key: 'export', label: '导出', type: 'default' }],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.exportRows).toHaveBeenCalledWith('filtered')
  })

  it('shows info for unrecognized action kind', () => {
    const handlers = createHandlers()
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction({
        label: '自定义操作',
        type: 'default',
      })
    })

    expect(infoMock).toHaveBeenCalled()
  })

  it('calls handler for exportMaterialRows', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('exportMaterialRows')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'export_material', label: '导出物料', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: true,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.exportMaterialRows).toHaveBeenCalled()
  })

  it('calls handler for markSelectedFreightDelivered', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('markSelectedFreightDelivered')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [
            { key: 'mark_delivered', label: '标记送达', type: 'default' },
          ],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.markSelectedFreightDelivered).toHaveBeenCalled()
  })

  it('calls handler for openCreateEditor', () => {
    const handlers = createHandlers()
    resolveModuleActionKindMock.mockReturnValue('openCreateEditor')
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [{ key: 'create', label: '新增订单', type: 'primary' }],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    act(() => {
      void result.current.handleAction(result.current.visibleToolbarActions[0])
    })

    expect(handlers.openCreateEditor).toHaveBeenCalled()
  })

  it('canUseAction returns true when hasAnyModuleAction returns true', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: {
          ...baseConfig,
          actions: [{ key: 'create', label: '新增', type: 'primary' }],
        },
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    expect(
      result.current.canUseAction({
        key: 'create',
        label: '新增',
        type: 'primary',
      }),
    ).toBe(true)
  })

  it('canUseAction returns false when hasAnyModuleAction returns false', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 0,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => false,
        handlers: createHandlers(),
      }),
    )

    expect(
      result.current.canUseAction({
        key: 'create',
        label: '新增',
        type: 'primary',
      }),
    ).toBe(false)
  })
})
