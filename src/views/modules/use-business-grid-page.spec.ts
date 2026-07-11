import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPageDefinition } from '@/config/page-registry'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { useBusinessGridPage } from '@/views/modules/use-business-grid-page'

const mocks = vi.hoisted(() => ({
  applyFilters: vi.fn(),
  buildActions: vi.fn(),
  buildDefaultModuleFilters: vi.fn(),
  can: vi.fn(),
  closeDetail: vi.fn(),
  closeEditor: vi.fn(),
  formatCellValue: vi.fn(),
  getBehaviorValue: vi.fn(),
  isEditBlockedByStatus: vi.fn(),
  getRowClassName: vi.fn(),
  handleAction: vi.fn(),
  handleEditorSaved: vi.fn(),
  handleExport: vi.fn(),
  handlePrintSelectedRecords: vi.fn(),
  handleReset: vi.fn(),
  handleSearch: vi.fn(),
  handleSelectedAuditRecords: vi.fn(),
  handleSelectedDeleteRecords: vi.fn(),
  handleSelectedReverseAuditRecords: vi.fn(),
  handleStatementGenerate: vi.fn(),
  fetchAttachmentCounts: vi.fn(),
  navigate: vi.fn(),
  onColumnOrderChange: vi.fn(),
  openAttachment: vi.fn(),
  openCustomerStatement: vi.fn(),
  openDetail: vi.fn(),
  openEditor: vi.fn(),
  openFreightPickup: vi.fn(),
  openFreightStatement: vi.fn(),
  openFreightSummary: vi.fn(),
  openPrepaymentAllocation: vi.fn(),
  openSupplierStatement: vi.fn(),
  refreshModuleQueries: vi.fn(),
  resolveMasterOptionRequirements: vi.fn(),
  resolveStatusOptions: vi.fn(),
  setSubmittedFilters: vi.fn(),
  setFilters: vi.fn(),
  toggleColumn: vi.fn(),
  updateFilter: vi.fn(),
  updateBusinessModuleStatus: vi.fn(),
  useBusinessGridActions: vi.fn(),
  useBusinessGridEditor: vi.fn(),
  useBusinessGridOverlays: vi.fn(),
  useBusinessGridTable: vi.fn(),
  useDefaultPageSize: vi.fn(),
  useDetailSupport: vi.fn(),
  useExcelExport: vi.fn(),
  useInfiniteBusinessItems: vi.fn(),
  useMasterOptions: vi.fn(),
  useModuleEditorCapabilities: vi.fn(),
  useModuleFilters: vi.fn(),
  useModulePageConfig: vi.fn(),
  useModulePermissions: vi.fn(),
  useModuleRecordActions: vi.fn(),
  useModuleRecordHelpers: vi.fn(),
  useModuleToolbarActions: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/hooks/useBusinessGridActions', () => ({
  useBusinessGridActions: mocks.useBusinessGridActions,
}))

vi.mock('@/api/business', () => ({
  fetchAttachmentCounts: mocks.fetchAttachmentCounts,
  updateBusinessModuleStatus: mocks.updateBusinessModuleStatus,
}))

vi.mock('@/hooks/useDefaultPageSize', () => ({
  useDefaultPageSize: mocks.useDefaultPageSize,
}))

vi.mock('@/hooks/useDetailSupport', () => ({
  useDetailSupport: mocks.useDetailSupport,
}))

vi.mock('@/hooks/useExcelExport', () => ({
  useExcelExport: mocks.useExcelExport,
}))

vi.mock('@/hooks/useInfiniteBusinessItems', () => ({
  useInfiniteBusinessItems: mocks.useInfiniteBusinessItems,
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  resolveMasterOptionRequirements: mocks.resolveMasterOptionRequirements,
  useMasterOptions: mocks.useMasterOptions,
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: vi.fn().mockReturnValue({
    formatCellValue: mocks.formatCellValue,
  }),
}))

vi.mock('@/hooks/useModuleEditorCapabilities', () => ({
  useModuleEditorCapabilities: mocks.useModuleEditorCapabilities,
}))

vi.mock('@/hooks/useModuleFilters', () => ({
  buildDefaultModuleFilters: mocks.buildDefaultModuleFilters,
  useModuleFilters: mocks.useModuleFilters,
}))

vi.mock('@/hooks/useModulePageConfig', () => ({
  useModulePageConfig: mocks.useModulePageConfig,
}))

vi.mock('@/hooks/useModulePermissions', () => ({
  useModulePermissions: mocks.useModulePermissions,
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: vi.fn().mockReturnValue({
    refreshModuleQueries: mocks.refreshModuleQueries,
  }),
}))

vi.mock('@/hooks/useModuleRecordActions', () => ({
  useModuleRecordActions: mocks.useModuleRecordActions,
}))

vi.mock('@/hooks/useModuleRecordHelpers', () => ({
  useModuleRecordHelpers: mocks.useModuleRecordHelpers,
}))

vi.mock('@/hooks/useModuleToolbarActions', () => ({
  useModuleToolbarActions: mocks.useModuleToolbarActions,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (value: unknown) => String(value ?? ''),
}))

vi.mock('@/module-system/module-adapter-actions', () => ({
  resolveStatusOptions: mocks.resolveStatusOptions,
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  getBehaviorValue: mocks.getBehaviorValue,
  isEditBlockedByStatus: mocks.isEditBlockedByStatus,
}))

vi.mock('@/views/modules/use-business-grid-editor', () => ({
  useBusinessGridEditor: mocks.useBusinessGridEditor,
}))

vi.mock('@/views/modules/use-business-grid-overlays', () => ({
  useBusinessGridOverlays: mocks.useBusinessGridOverlays,
}))

vi.mock('@/views/modules/use-business-grid-table', () => ({
  useBusinessGridTable: mocks.useBusinessGridTable,
}))

describe('useBusinessGridPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.buildActions.mockReturnValue([{ key: 'attach', label: '附件' }])
    mocks.buildDefaultModuleFilters.mockReturnValue({
      orderDate: ['2026-05-29', '2026-06-28'],
    })
    mocks.can.mockReturnValue(false)
    mocks.getBehaviorValue.mockReturnValue(null)
    mocks.fetchAttachmentCounts.mockResolvedValue({
      data: { moduleKey: 'purchase-inbound', counts: { '1': 2, '2': 0 } },
    })
    mocks.updateBusinessModuleStatus.mockResolvedValue({
      message: '状态更新成功',
    })
    mocks.getRowClassName.mockReturnValue('')
    mocks.resolveMasterOptionRequirements.mockReturnValue(['customers'])
    mocks.useBusinessGridActions.mockReturnValue({
      handlePrintSelectedRecords: mocks.handlePrintSelectedRecords,
      handleSelectedAuditRecords: mocks.handleSelectedAuditRecords,
      handleSelectedDeleteRecords: mocks.handleSelectedDeleteRecords,
      handleSelectedReverseAuditRecords:
        mocks.handleSelectedReverseAuditRecords,
      openFreightSummary: mocks.openFreightSummary,
      handleStatementGenerate: mocks.handleStatementGenerate,
    })
    mocks.useBusinessGridEditor.mockReturnValue({
      editRecord: { id: 'edit-1', status: '草稿' },
      editorLockLoading: false,
      editorLockRelatedRows: [{ id: 'line-1' }],
      editorOpen: false,
      openEditor: mocks.openEditor,
      closeEditor: mocks.closeEditor,
      handleSaved: mocks.handleEditorSaved,
    })
    mocks.useBusinessGridOverlays.mockReturnValue({
      openAttachment: mocks.openAttachment,
      openCustomerStatement: mocks.openCustomerStatement,
      openPrepaymentAllocation: mocks.openPrepaymentAllocation,
      openSupplierStatement: mocks.openSupplierStatement,
      openFreightStatement: mocks.openFreightStatement,
      openFreightPickup: mocks.openFreightPickup,
    })
    mocks.useBusinessGridTable.mockReturnValue({
      columnOrder: ['projectName'],
      columnVisibleKeys: ['projectName'],
      antdColumns: [{ key: 'projectName' }],
      toggleColumn: mocks.toggleColumn,
      rowSelection: { selectedRowKeys: [] },
      onColumnOrderChange: mocks.onColumnOrderChange,
    })
    mocks.useDefaultPageSize.mockReturnValue(30)
    mocks.useDetailSupport.mockReturnValue({
      detailOpen: false,
      detailRecord: null,
      detailLoading: false,
      openDetail: mocks.openDetail,
      closeDetail: mocks.closeDetail,
    })
    mocks.useExcelExport.mockReturnValue({
      exporting: false,
      handleExport: mocks.handleExport,
    })
    mocks.useInfiniteBusinessItems.mockReturnValue({
      records: [
        { id: '1', projectId: 'P-1' },
        { id: '2', projectId: 'P-2' },
      ],
      total: 2,
      isLoading: false,
      isFetching: false,
      warningMessage: 'warning',
    })
    mocks.useModuleEditorCapabilities.mockReturnValue({
      canUseBulkAuditActions: true,
      canUseBulkDeleteActions: true,
      canUseBulkPrintActions: true,
      lineItemsLocked: true,
      listAuditTarget: '已审核',
      listReverseAuditTarget: '草稿',
      listAuditSourceStatuses: ['草稿', '预出库'],
    })
    mocks.useModuleFilters.mockReturnValue({
      filters: { keyword: 'draft' },
      submittedFilters: { keyword: 'submitted' },
      applyFilters: mocks.applyFilters,
      handleSearch: mocks.handleSearch,
      handleReset: mocks.handleReset,
      updateFilter: mocks.updateFilter,
      setFilters: mocks.setFilters,
      setSubmittedFilters: mocks.setSubmittedFilters,
    })
    mocks.useModulePageConfig.mockReturnValue({
      config: config(),
    })
    mocks.useModulePermissions.mockReturnValue({
      canViewRecords: true,
      canCreateRecord: true,
      canUpdateRecord: true,
      canDeleteRecord: false,
      canExportData: true,
      canAuditRecord: true,
      canPrintRecord: true,
      can: mocks.can,
      resolvedResource: 'purchase-inbound',
    })
    mocks.useModuleRecordActions.mockReturnValue({
      buildActions: mocks.buildActions,
    })
    mocks.isEditBlockedByStatus.mockReturnValue(false)
    mocks.useModuleRecordHelpers.mockReturnValue({
      getRowClassName: mocks.getRowClassName,
    })
    mocks.useModuleToolbarActions.mockReturnValue({
      visibleToolbarActions: [{ key: 'exportRows', label: '导出' }],
      handleAction: mocks.handleAction,
    })
  })

  it('returns page state and wires child hooks with resolved inputs', () => {
    const { result } = renderHook(() => useBusinessGridPage(props()))

    expect(result.current.config?.key).toBe('purchase-inbound')
    expect(result.current.pageSize).toBe(30)
    expect(result.current.records).toHaveLength(2)
    expect(result.current.total).toBe(2)
    expect(result.current.visibleToolbarActions).toHaveLength(1)
    expect(result.current.canUseBulkPrintActions).toBe(true)
    expect(result.current.defaultFilters).toEqual({
      orderDate: ['2026-05-29', '2026-06-28'],
    })
    expect(result.current.submittedFilters).toEqual({ keyword: 'submitted' })
    expect(mocks.buildDefaultModuleFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'purchase-inbound',
        filters: [{ key: 'keyword', label: '关键字', type: 'text' }],
      }),
    )
    expect(mocks.useModuleFilters).toHaveBeenCalledWith({
      defaultFilters: { orderDate: ['2026-05-29', '2026-06-28'] },
      setCurrentPage: expect.any(Function),
    })
    act(() => {
      mocks.useModuleFilters.mock.calls[0][0].setCurrentPage(4)
    })
    expect(result.current.currentPage).toBe(4)
    expect(mocks.useInfiniteBusinessItems).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleKey: 'purchase-inbound',
        filters: { keyword: 'submitted' },
        enabled: true,
        currentPage: 1,
        pageSize: 30,
      }),
    )
    expect(mocks.useBusinessGridTable).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleKey: 'purchase-inbound',
        records: [
          { id: '1', projectId: 'P-1' },
          { id: '2', projectId: 'P-2' },
        ],
        showActions: true,
      }),
    )
  })

  it('loads attachment counts for current page records and passes them to row actions', async () => {
    renderHook(() => useBusinessGridPage(props()))

    await waitFor(() => {
      expect(mocks.fetchAttachmentCounts).toHaveBeenCalledWith(
        'purchase-inbound',
        ['1', '2'],
      )
    })
    await waitFor(() => {
      expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          attachmentCounts: { '1': 2, '2': 0 },
        }),
      )
    })
  })

  it('updates completed sales order from the command region reopen action', async () => {
    const record = { id: '1', status: '完成销售' }
    const baseProps = props()
    const { result } = renderHook(() =>
      useBusinessGridPage({
        ...baseProps,
        moduleKey: 'sales-order',
        pageDef: {
          ...baseProps.pageDef,
          moduleKey: 'sales-order',
          resourceKey: 'sales-order',
        },
      }),
    )

    await act(async () => {
      result.current.setSelectedRowKeys(['1'])
      result.current.setSelectedRowMap({ '1': record })
    })

    const action = result.current.visibleToolbarActions.find(
      (item: ModuleActionDefinition) =>
        item.key === 'reopen-delivery-verification',
    )
    expect(action).toEqual(expect.objectContaining({ label: '重新核定' }))
    expect(action).not.toHaveProperty('disabled')

    await act(async () => {
      await result.current.handleAction(action)
    })

    expect(mocks.updateBusinessModuleStatus).toHaveBeenCalledWith(
      'sales-order',
      '1',
      '交付核定',
    )
    expect(mocks.refreshModuleQueries).toHaveBeenCalled()
  })

  it('hides the reopen action until one completed sales order is selected', () => {
    const baseProps = props()
    const { result } = renderHook(() =>
      useBusinessGridPage({
        ...baseProps,
        moduleKey: 'sales-order',
        pageDef: {
          ...baseProps.pageDef,
          moduleKey: 'sales-order',
          resourceKey: 'sales-order',
        },
      }),
    )

    expect(
      result.current.visibleToolbarActions.some(
        (item: ModuleActionDefinition) =>
          item.key === 'reopen-delivery-verification',
      ),
    ).toBe(false)
  })

  it('opens prepayment allocation only for one paid purchase prepayment', async () => {
    const payment = {
      id: 'payment-1',
      paymentPurpose: 'PURCHASE_PREPAYMENT',
      status: '已付款',
    }
    const baseProps = props()
    const { result } = renderHook(() =>
      useBusinessGridPage({
        ...baseProps,
        moduleKey: 'payment',
        pageDef: {
          ...baseProps.pageDef,
          moduleKey: 'payment',
          resourceKey: 'payment',
        },
      }),
    )

    await act(async () => {
      result.current.setSelectedRowKeys([payment.id])
      result.current.setSelectedRowMap({ [payment.id]: payment })
    })

    const action = result.current.visibleToolbarActions.find(
      (item: ModuleActionDefinition) =>
        item.key === 'allocate-purchase-prepayment',
    )
    expect(action).toEqual(
      expect.objectContaining({ label: '分配预付款', type: 'default' }),
    )

    await act(async () => {
      await result.current.handleAction(action)
    })

    expect(mocks.openPrepaymentAllocation).toHaveBeenCalledWith(payment)
    expect(mocks.openEditor).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: '未选择付款单',
      selectedRows: [],
    },
    {
      name: '选择多张付款单',
      selectedRows: [
        {
          id: 'payment-1',
          paymentPurpose: 'PURCHASE_PREPAYMENT',
          status: '已付款',
        },
        {
          id: 'payment-2',
          paymentPurpose: 'PURCHASE_PREPAYMENT',
          status: '已付款',
        },
      ],
    },
    {
      name: '选择普通对账付款',
      selectedRows: [
        {
          id: 'payment-1',
          paymentPurpose: 'STATEMENT_SETTLEMENT',
          status: '已付款',
        },
      ],
    },
    {
      name: '选择草稿采购预付款',
      selectedRows: [
        {
          id: 'payment-1',
          paymentPurpose: 'PURCHASE_PREPAYMENT',
          status: '草稿',
        },
      ],
    },
  ])('$name时隐藏预付款分配动作', async ({ selectedRows }) => {
    const baseProps = props()
    const { result } = renderHook(() =>
      useBusinessGridPage({
        ...baseProps,
        moduleKey: 'payment',
        pageDef: {
          ...baseProps.pageDef,
          moduleKey: 'payment',
          resourceKey: 'payment',
        },
      }),
    )

    await act(async () => {
      result.current.setSelectedRowKeys(selectedRows.map((record) => record.id))
      result.current.setSelectedRowMap(
        Object.fromEntries(selectedRows.map((record) => [record.id, record])),
      )
    })

    expect(
      result.current.visibleToolbarActions.some(
        (item: ModuleActionDefinition) =>
          item.key === 'allocate-purchase-prepayment',
      ),
    ).toBe(false)
  })

  it('does not open prepayment allocation without payment update permission', async () => {
    mocks.useModulePermissions.mockReturnValue({
      canViewRecords: true,
      canCreateRecord: false,
      canUpdateRecord: false,
      canDeleteRecord: false,
      canExportData: false,
      canAuditRecord: false,
      canPrintRecord: false,
      can: mocks.can,
      resolvedResource: 'payment',
    })
    const payment = {
      id: 'payment-1',
      paymentPurpose: 'PURCHASE_PREPAYMENT',
      status: '已付款',
    }
    const baseProps = props()
    const { result } = renderHook(() =>
      useBusinessGridPage({
        ...baseProps,
        moduleKey: 'payment',
        pageDef: {
          ...baseProps.pageDef,
          moduleKey: 'payment',
          resourceKey: 'payment',
        },
      }),
    )

    await act(async () => {
      result.current.setSelectedRowKeys([payment.id])
      result.current.setSelectedRowMap({ [payment.id]: payment })
    })
    await act(async () => {
      await result.current.handleAction({
        key: 'allocate-purchase-prepayment',
        label: '分配预付款',
      })
    })

    expect(mocks.openPrepaymentAllocation).not.toHaveBeenCalled()
    expect(
      result.current.visibleToolbarActions.some(
        (item: ModuleActionDefinition) =>
          item.key === 'allocate-purchase-prepayment',
      ),
    ).toBe(false)
  })

  it('skips records and attachment counts when view permission is missing', () => {
    mocks.useModulePermissions.mockReturnValue({
      canViewRecords: false,
      canCreateRecord: false,
      canUpdateRecord: false,
      canDeleteRecord: false,
      canExportData: false,
      canAuditRecord: false,
      canPrintRecord: false,
      can: mocks.can,
      resolvedResource: 'purchase-inbound',
    })

    renderHook(() => useBusinessGridPage(props()))

    expect(mocks.useInfiniteBusinessItems).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    )
    expect(mocks.fetchAttachmentCounts).not.toHaveBeenCalled()
    expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachmentCounts: {},
      }),
    )
    expect(mocks.useModuleEditorCapabilities).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditLineItems: false,
        canSaveCurrentEditor: false,
      }),
    )
  })

  it('skips attachment counts when current records have no ids', () => {
    mocks.useInfiniteBusinessItems.mockReturnValue({
      records: [],
      total: 0,
      isLoading: false,
      isFetching: false,
      warningMessage: null,
    })

    renderHook(() => useBusinessGridPage(props()))

    expect(mocks.fetchAttachmentCounts).not.toHaveBeenCalled()
    expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachmentCounts: {},
      }),
    )
  })

  it('clears attachment counts when count loading fails', async () => {
    mocks.fetchAttachmentCounts.mockRejectedValue(new Error('load failed'))

    renderHook(() => useBusinessGridPage(props()))

    await waitFor(() => {
      expect(mocks.fetchAttachmentCounts).toHaveBeenCalledWith(
        'purchase-inbound',
        ['1', '2'],
      )
    })
    await waitFor(() => {
      expect(mocks.useModuleRecordActions).toHaveBeenCalledTimes(2)
    })
    expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachmentCounts: {},
      }),
    )
  })

  it('falls back to empty attachment counts when response omits counts', async () => {
    mocks.fetchAttachmentCounts.mockResolvedValue({
      data: {},
    })

    renderHook(() => useBusinessGridPage(props()))

    await waitFor(() => {
      expect(mocks.useModuleRecordActions).toHaveBeenCalledTimes(2)
    })
    expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachmentCounts: {},
      }),
    )
  })

  it('ignores attachment count success after unmount', async () => {
    let resolveCounts:
      | ((value: { data: { counts: Record<string, number> } }) => void)
      | undefined
    const countsPromise = new Promise<{
      data: { counts: Record<string, number> }
    }>((resolve) => {
      resolveCounts = resolve
    })
    mocks.fetchAttachmentCounts.mockReturnValue(countsPromise)

    const { unmount } = renderHook(() => useBusinessGridPage(props()))

    await waitFor(() => {
      expect(mocks.fetchAttachmentCounts).toHaveBeenCalled()
    })
    unmount()
    await act(async () => {
      resolveCounts?.({ data: { counts: { '1': 9 } } })
      await countsPromise
    })

    expect(mocks.useModuleRecordActions).toHaveBeenCalledTimes(1)
  })

  it('ignores attachment count failure after unmount', async () => {
    let rejectCounts: ((reason?: unknown) => void) | undefined
    const countsPromise = new Promise<never>((_, reject) => {
      rejectCounts = reject
    })
    mocks.fetchAttachmentCounts.mockReturnValue(countsPromise)

    const { unmount } = renderHook(() => useBusinessGridPage(props()))

    await waitFor(() => {
      expect(mocks.fetchAttachmentCounts).toHaveBeenCalled()
    })
    unmount()
    await act(async () => {
      rejectCounts?.(new Error('cancelled'))
      await countsPromise.catch(() => undefined)
    })

    expect(mocks.useModuleRecordActions).toHaveBeenCalledTimes(1)
  })

  it('updates pagination and clears selected rows', () => {
    const { result } = renderHook(() => useBusinessGridPage(props()))

    act(() => result.current.setCurrentPage(3))
    act(() => result.current.setPageSize(50))
    act(() => result.current.setSelectedRowKeys(['1', '2']))
    act(() =>
      result.current.setSelectedRowMap({
        '1': { id: '1' },
      }),
    )
    act(() => result.current.clearSelection())

    expect(result.current.currentPage).toBe(3)
    expect(result.current.pageSize).toBe(50)
    expect(result.current.selectedRowKeys).toEqual([])
  })

  it('clears hidden selections when applying, searching or resetting filters', async () => {
    const { result } = renderHook(() => useBusinessGridPage(props()))
    await waitFor(() => {
      expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
        expect.objectContaining({ attachmentCounts: { '1': 2, '2': 0 } }),
      )
    })

    const selectRecord = () => {
      act(() => result.current.setSelectedRowKeys(['1']))
      act(() => result.current.setSelectedRowMap({ '1': { id: '1' } }))
    }

    selectRecord()
    act(() => result.current.applyFilters({ status: '草稿' }))
    expect(result.current.selectedRowKeys).toEqual([])
    expect(result.current.selectedRows).toEqual([])

    selectRecord()
    act(() => result.current.handleSearch())
    expect(result.current.selectedRowKeys).toEqual([])
    expect(result.current.selectedRows).toEqual([])

    selectRecord()
    act(() => result.current.handleReset())
    expect(result.current.selectedRowKeys).toEqual([])
    expect(result.current.selectedRows).toEqual([])
  })

  it('wires explicit row editing through the record action builder', async () => {
    renderHook(() => useBusinessGridPage(props()))
    await waitFor(() => {
      expect(mocks.useModuleRecordActions).toHaveBeenLastCalledWith(
        expect.objectContaining({ attachmentCounts: { '1': 2, '2': 0 } }),
      )
    })
    const actionOptions = mocks.useModuleRecordActions.mock.calls.at(-1)?.[0]
    const record = { id: '1', status: '草稿' }

    expect(actionOptions.canEditRecord(record)).toBe(true)
    await act(async () => {
      actionOptions.onEdit(record)
      await Promise.resolve()
    })

    expect(mocks.openEditor).toHaveBeenCalledWith(record)
  })

  it('exports submitted filters for master data pages', async () => {
    const { result } = renderHook(() => useBusinessGridPage(masterProps()))

    await act(async () => {
      await result.current.handleExport()
    })

    expect(result.current.canExportData).toBe(true)
    expect(mocks.handleExport).toHaveBeenCalledWith({ keyword: 'submitted' })
  })

  it('removes list export outside master data pages', async () => {
    mocks.useModulePageConfig.mockReturnValue({
      config: {
        ...config(),
        actions: [
          { key: 'create', label: '新增' },
          { key: 'export', label: '导出' },
          { key: 'export_balance', label: '导出账款' },
          { key: 'downloadAll', label: '批量导出' },
        ],
      },
    })
    const { result } = renderHook(() => useBusinessGridPage(props()))

    await act(async () => {
      await result.current.handleExport()
    })

    const toolbarOptions = mocks.useModuleToolbarActions.mock.calls[0][0]
    expect(result.current.canExportData).toBe(false)
    expect(toolbarOptions.config.actions).toEqual([
      { key: 'create', label: '新增' },
    ])
    expect(mocks.handleExport).not.toHaveBeenCalled()
  })

  it('keeps non-export toolbar actions unchanged outside master data pages', () => {
    const toolbarConfig = {
      ...config(),
      actions: [{ key: 'refresh', label: '刷新' }],
    }
    mocks.useModulePageConfig.mockReturnValue({
      config: toolbarConfig,
    })

    renderHook(() => useBusinessGridPage(props()))

    const toolbarOptions = mocks.useModuleToolbarActions.mock.calls[0][0]
    expect(toolbarOptions.config).toBe(toolbarConfig)
  })

  it('exposes delegated actions', () => {
    const { result } = renderHook(() => useBusinessGridPage(props()))

    result.current.handleAction('exportRows')
    result.current.applyFilters({ status: '草稿' })
    result.current.handleSearch()
    result.current.handleReset()
    result.current.updateFilter('keyword', '钢材')
    result.current.setFilters({ keyword: '钢材' })
    result.current.setSubmittedFilters({ keyword: '钢材' })
    result.current.refreshModuleQueries()
    result.current.toggleColumn('projectName')
    result.current.onColumnOrderChange(['projectName'])

    expect(mocks.handleAction).toHaveBeenCalledWith('exportRows')
    expect(mocks.applyFilters).toHaveBeenCalledWith({ status: '草稿' })
    expect(mocks.handleSearch).toHaveBeenCalled()
    expect(mocks.handleReset).toHaveBeenCalled()
    expect(mocks.updateFilter).toHaveBeenCalledWith('keyword', '钢材')
    expect(mocks.setFilters).toHaveBeenCalledWith({ keyword: '钢材' })
    expect(mocks.setSubmittedFilters).toHaveBeenCalledWith({ keyword: '钢材' })
    expect(mocks.refreshModuleQueries).toHaveBeenCalled()
    expect(mocks.toggleColumn).toHaveBeenCalledWith('projectName')
    expect(mocks.onColumnOrderChange).toHaveBeenCalledWith(['projectName'])
  })

  it('opens editors, detail overlay and detail route according to behavior', async () => {
    const { result, rerender } = renderHook(
      ({ moduleKey }) =>
        useBusinessGridPage({
          ...props(),
          moduleKey,
        }),
      { initialProps: { moduleKey: 'receivable-payable' } },
    )

    await act(async () => {
      await result.current.openEditor(null)
    })
    result.current.openDetail({ id: '1' })
    expect(mocks.openEditor).toHaveBeenCalledWith(null)
    expect(mocks.openDetail).toHaveBeenCalledWith({ id: '1' })

    mocks.getBehaviorValue.mockImplementation((key: string, name: string) =>
      key === 'project-receivable' && name === 'detailRoutePath'
        ? '/projects/:projectId/receivable'
        : null,
    )
    rerender({ moduleKey: 'project-receivable' })
    const recordActionsArg = mocks.useModuleRecordActions.mock.calls.at(-1)?.[0]
    recordActionsArg.onDetail({ id: 'r-1', projectId: 99 } as ModuleRecord)

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/projects/99/receivable',
    })
  })

  it('uses configured detail action as overlay action', () => {
    mocks.useModulePageConfig.mockReturnValue({
      config: {
        ...config(),
        readOnly: true,
        detailActionLabel: '流水',
      },
    })

    renderHook(() => useBusinessGridPage(props()))

    const recordActionsArg = mocks.useModuleRecordActions.mock.calls.at(-1)?.[0]
    expect(recordActionsArg.detailActionLabel).toBe('流水')
    expect(recordActionsArg.onDetail).toBe(mocks.openDetail)
  })

  it('wires toolbar handlers for statement and freight actions', () => {
    window.history.replaceState(null, '', '/access-control?tab=roles')
    renderHook(() => useBusinessGridPage(props()))
    const toolbarOptions = mocks.useModuleToolbarActions.mock.calls[0][0]

    toolbarOptions.handlers.openCreateEditor()
    toolbarOptions.handlers.openCustomerStatementGenerator()
    toolbarOptions.handlers.openSupplierStatementGenerator()
    toolbarOptions.handlers.openFreightStatementGenerator()
    toolbarOptions.handlers.openFreightSummary()
    toolbarOptions.handlers.handleSelectedAuditRecords()
    toolbarOptions.handlers.handleSelectedDeleteRecords()
    toolbarOptions.handlers.handleSelectedReverseAuditRecords()
    toolbarOptions.handlers.openFreightPickupList()
    toolbarOptions.handlers.navigateToRoleActionEditor()

    expect(mocks.openEditor).toHaveBeenCalledWith(null)
    expect(mocks.openCustomerStatement).toHaveBeenCalled()
    expect(mocks.openSupplierStatement).toHaveBeenCalled()
    expect(mocks.openFreightStatement).toHaveBeenCalled()
    expect(mocks.openFreightSummary).toHaveBeenCalled()
    expect(mocks.handleSelectedAuditRecords).toHaveBeenCalled()
    expect(mocks.handleSelectedDeleteRecords).toHaveBeenCalled()
    expect(mocks.handleSelectedReverseAuditRecords).toHaveBeenCalled()
    expect(mocks.openFreightPickup).toHaveBeenCalledWith([])
  })

  it('evaluates toolbar permissions and toolbar export handlers', async () => {
    const { result } = renderHook(() => useBusinessGridPage(masterProps()))
    const toolbarOptions = mocks.useModuleToolbarActions.mock.calls[0][0]

    mocks.can.mockReturnValueOnce(true)

    expect(toolbarOptions.hasAnyModuleAction(['create'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['update'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['delete'])).toBe(false)
    expect(toolbarOptions.hasAnyModuleAction(['audit'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['export'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['print'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['manage_permissions'])).toBe(true)
    expect(toolbarOptions.hasAnyModuleAction(['unknown'])).toBe(false)

    await act(async () => {
      await toolbarOptions.handlers.exportRows()
      await toolbarOptions.handlers.exportMaterialRows()
    })

    expect(mocks.can).toHaveBeenCalledWith(
      'purchase-inbound',
      'manage_permissions',
    )
    expect(mocks.handleExport).toHaveBeenCalledTimes(2)
    expect(result.current.canExportData).toBe(true)
  })

  it('opens freight pickup with selected records and exposes action context', () => {
    const { result } = renderHook(() => useBusinessGridPage(props()))

    act(() => result.current.setSelectedRowKeys(['1']))
    act(() =>
      result.current.setSelectedRowMap({
        '1': { id: '1', projectId: 'P-1' },
      }),
    )
    const actionOptions = mocks.useBusinessGridActions.mock.calls.at(-1)?.[0]
    const toolbarOptions = mocks.useModuleToolbarActions.mock.calls.at(-1)?.[0]

    toolbarOptions.handlers.openFreightPickupList()
    expect(result.current.selectedRows).toEqual([{ id: '1', projectId: 'P-1' }])
    act(() => actionOptions.clearSelection())

    expect(actionOptions.selectedRows).toEqual([{ id: '1', projectId: 'P-1' }])
    expect(actionOptions.listAuditSourceStatuses).toEqual(['草稿', '预出库'])
    expect(actionOptions.refreshModuleQueries).toBe(mocks.refreshModuleQueries)
    expect(mocks.openFreightPickup).toHaveBeenCalledWith([
      { id: '1', projectId: 'P-1' },
    ])
    expect(result.current.selectedRowKeys).toEqual([])
  })

  it('uses empty config and form field fallbacks while config is loading', () => {
    mocks.useModulePageConfig.mockReturnValue({
      config: undefined,
    })
    mocks.useBusinessGridEditor.mockReturnValue({
      editRecord: null,
      editorLockLoading: false,
      editorLockRelatedRows: [],
      editorOpen: false,
      openEditor: mocks.openEditor,
      closeEditor: mocks.closeEditor,
      handleSaved: mocks.handleEditorSaved,
    })
    mocks.resolveStatusOptions.mockReturnValue([
      { label: '草稿', value: 'draft' },
    ])

    const { result } = renderHook(() => useBusinessGridPage(props()))
    const capabilityOptions =
      mocks.useModuleEditorCapabilities.mock.calls.at(-1)?.[0]
    const statusField = {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [{ label: '草稿', value: 'draft' }],
    }

    expect(result.current.config).toBeUndefined()
    expect(mocks.buildDefaultModuleFilters).toHaveBeenCalledWith(undefined)
    expect(mocks.resolveMasterOptionRequirements).toHaveBeenCalledWith([])
    expect(mocks.useDetailSupport).toHaveBeenCalledWith({
      moduleKey: 'purchase-inbound',
      config: expect.objectContaining({ key: '', columns: [] }),
    })
    expect(mocks.useBusinessGridEditor).toHaveBeenCalledWith({
      moduleKey: 'purchase-inbound',
      config: expect.objectContaining({ key: '', columns: [] }),
    })
    expect(
      mocks.useDetailSupport.mock.calls.at(-1)?.[0].config.buildOverview([]),
    ).toEqual([])
    expect(mocks.useBusinessGridTable).toHaveBeenCalledWith(
      expect.objectContaining({
        config: undefined,
      }),
    )
    expect(capabilityOptions).toEqual(
      expect.objectContaining({
        formFields: [],
        listStatusFields: [],
        currentStatus: undefined,
        isReadOnly: false,
      }),
    )
    expect(capabilityOptions.resolveModuleStatusOptions({})).toEqual([])
    expect(capabilityOptions.resolveModuleStatusOptions(statusField)).toEqual([
      { label: '草稿', value: 'draft' },
    ])
    expect(mocks.resolveStatusOptions).toHaveBeenCalledWith({
      fields: [statusField],
    })
  })
})

function props() {
  return {
    moduleKey: 'purchase-inbound',
    pageDef: {
      key: 'purchase-inbound',
      menuKey: '/purchase-inbound',
      moduleKey: 'purchase-inbound',
      resourceKey: 'purchase-inbound',
      title: '采购入库',
    } as AppPageDefinition,
    initialConfig: config(),
  }
}

function masterProps() {
  const base = props()
  return {
    ...base,
    pageDef: {
      ...base.pageDef,
      menuParent: 'master',
    } as AppPageDefinition,
  }
}

function config(): ModulePageConfig {
  return {
    key: 'purchase-inbound',
    title: '采购入库',
    kicker: '',
    description: '',
    filters: [{ key: 'keyword', label: '关键字', type: 'text' }],
    columns: [{ dataIndex: 'projectName', title: '项目' }],
    detailFields: [],
    formFields: [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: ['草稿', '已审核'],
      },
    ],
    data: [],
    buildOverview: () => [],
  }
}
