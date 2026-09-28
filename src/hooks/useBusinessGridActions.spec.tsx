// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openEditorMock = vi.hoisted(() => vi.fn())
const openEditorHoldMock = vi.hoisted(() => vi.fn())
const handleExportMock = vi.hoisted(() => vi.fn())
const refreshModuleQueriesMock = vi.hoisted(() => vi.fn())
const updateBusinessModuleStatusMock = vi.hoisted(() => vi.fn())
const completeSalesOrderMock = vi.hoisted(() => vi.fn())
const messageSuccessMock = vi.hoisted(() => vi.fn())
const messageErrorMock = vi.hoisted(() => vi.fn())
const messageInfoMock = vi.hoisted(() => vi.fn())
const modalConfirmMock = vi.hoisted(() => vi.fn())
const handlePrintSelectedRecordsMock = vi.hoisted(() => vi.fn())
const handleExportSalesOrderPrintXlsxMock = vi.hoisted(() => vi.fn())
const handleExportSelectedRecordsMock = vi.hoisted(() => vi.fn())
const handleSelectedAuditRecordsMock = vi.hoisted(() => vi.fn())
const handleSelectedDeleteRecordsMock = vi.hoisted(() => vi.fn())
const handleSelectedReverseAuditRecordsMock = vi.hoisted(() => vi.fn())
const openFreightSummaryMock = vi.hoisted(() => vi.fn())
const openCustomerSummaryMock = vi.hoisted(() => vi.fn())
const openCustomerProjectsMock = vi.hoisted(() => vi.fn())

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: messageSuccessMock,
    error: messageErrorMock,
    info: messageInfoMock,
  },
  modal: { confirm: modalConfirmMock },
}))

vi.mock('@/api/business/business-crud', () => ({
  updateBusinessModuleStatus: updateBusinessModuleStatusMock,
}))

vi.mock('@/api/sales/document-flow-commands', () => ({
  completeSalesOrder: completeSalesOrderMock,
}))

vi.mock('@/hooks/useBusinessGridPrintActions', () => ({
  useBusinessGridPrintActions: () => ({
    handlePrintSelectedRecords: handlePrintSelectedRecordsMock,
    handleExportSalesOrderPrintXlsx: handleExportSalesOrderPrintXlsxMock,
    handleExportSelectedRecords: handleExportSelectedRecordsMock,
  }),
}))

vi.mock('@/hooks/useBusinessGridBatchActions', () => ({
  useBusinessGridBatchActions: () => ({
    handleSelectedAuditRecords: handleSelectedAuditRecordsMock,
    handleSelectedDeleteRecords: handleSelectedDeleteRecordsMock,
    handleSelectedReverseAuditRecords: handleSelectedReverseAuditRecordsMock,
  }),
}))

vi.mock('@/hooks/useBusinessGridFreightActions', () => ({
  useBusinessGridFreightActions: () => ({
    openFreightSummary: openFreightSummaryMock,
  }),
}))

vi.mock('@/hooks/useBusinessGridCustomerActions', () => ({
  useBusinessGridCustomerActions: () => ({
    openCustomerSummary: openCustomerSummaryMock,
  }),
}))

vi.mock('@/hooks/useBusinessGridCustomerProjectActions', () => ({
  useBusinessGridCustomerProjectActions: () => ({
    openCustomerProjects: openCustomerProjectsMock,
  }),
}))

import { useBusinessGridActions } from '@/hooks/useBusinessGridActions'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

function createConfig(
  overrides: Partial<ModulePageConfig> = {},
): ModulePageConfig {
  return {
    key: 'material',
    title: '物料',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    actions: [{ key: 'export', label: '导出', type: 'default' }],
    buildOverview: () => [],
    ...overrides,
  }
}

describe('useBusinessGridActions', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useBusinessGridActions>
  let moduleKey: Parameters<typeof useBusinessGridActions>[0]['moduleKey']
  let config: ModulePageConfig
  let selectedRowKeys: string[]
  let selectedRecords: ModuleRecord[]

  function Probe() {
    latest = useBusinessGridActions({
      moduleKey,
      config,
      toolbarConfig: config,
      selectedRowKeys,
      selectedRecords,
      submittedFilters: {},
      attachmentCounts: {},
      canCreateRecord: true,
      canUpdateRecord: true,
      canDeleteRecord: true,
      canAuditRecord: true,
      canPrintRecord: true,
      refreshModuleQueries: refreshModuleQueriesMock,
      clearSelection: () => {},
      handleExport: handleExportMock,
      editRecord: null,
      editorLockRelatedRows: [],
      openEditor: openEditorMock,
      openAttachment: openEditorHoldMock,
      recordDetailAction: undefined,
    })
    return null
  }

  function renderOnce() {
    act(() => {
      root.render(createElement(Probe))
    })
  }

  beforeEach(() => {
    moduleKey = 'material'
    config = createConfig()
    selectedRowKeys = []
    selectedRecords = []
    for (const mock of [
      openEditorMock,
      openEditorHoldMock,
      handleExportMock,
      refreshModuleQueriesMock,
      updateBusinessModuleStatusMock,
      completeSalesOrderMock,
      messageSuccessMock,
      messageErrorMock,
      messageInfoMock,
      handlePrintSelectedRecordsMock,
      handleExportSalesOrderPrintXlsxMock,
      handleExportSelectedRecordsMock,
      handleSelectedAuditRecordsMock,
      handleSelectedDeleteRecordsMock,
      handleSelectedReverseAuditRecordsMock,
    ]) {
      mock.mockReset()
    }
    modalConfirmMock.mockReset()
    modalConfirmMock.mockImplementation(() => {})
    refreshModuleQueriesMock.mockResolvedValue(undefined)
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)
    completeSalesOrderMock.mockResolvedValue(undefined)
    openEditorMock.mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    renderOnce()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('shows the bulk delete action only when rows are selected', () => {
    expect(
      latest.visibleToolbarActions.some(
        (action) => action.key === 'bulk_delete',
      ),
    ).toBe(false)

    selectedRowKeys = ['1', '2']
    selectedRecords = [{ id: '1' }, { id: '2' }]
    renderOnce()

    expect(
      latest.visibleToolbarActions.some(
        (action) => action.key === 'bulk_delete',
      ),
    ).toBe(true)
    expect(latest.canUseBulkPrintActions).toBe(true)
  })

  it('dispatches selected record actions to the record handlers', async () => {
    const record = { id: '7', materialName: '螺栓' }
    selectedRowKeys = ['7']
    selectedRecords = [record]
    renderOnce()

    expect(
      latest.visibleToolbarActions.some((action) => action.key === 'edit'),
    ).toBe(true)

    await act(async () => {
      await latest.handleAction({
        key: 'edit',
        label: '编辑',
        type: 'default',
      })
    })
    expect(openEditorMock).toHaveBeenCalledWith(record)
  })

  /**
   * 回归保护: 采购订单/采购入库的「批量审核/反审核」入口曾出现"勾选后不出现"的反馈。
   * 这里锁死状态机口径 —— 允许审核的记录勾选后出现入口, 终态记录不出现。
   */
  it('采购订单: 勾选草稿记录后工具栏出现「审核」', () => {
    moduleKey = 'purchase-order'
    config = createConfig({ key: 'purchase-order', title: '采购订单' })
    selectedRowKeys = ['1']
    selectedRecords = [{ id: '1', status: '草稿' }]
    renderOnce()

    const audit = latest.visibleToolbarActions.find(
      (action) => action.key === 'bulk_audit',
    )
    expect(audit).toBeDefined()
    expect(audit?.label).toBe('modules.statusActions.audit')
    expect(audit?.disabled).toBeFalsy()
  })

  it('采购订单: 勾选已审核记录后工具栏出现「反审核」', () => {
    moduleKey = 'purchase-order'
    config = createConfig({ key: 'purchase-order', title: '采购订单' })
    selectedRowKeys = ['1']
    selectedRecords = [{ id: '1', status: '已审核' }]
    renderOnce()

    const reverse = latest.visibleToolbarActions.find(
      (action) => action.key === 'bulk_reverse_audit',
    )
    expect(reverse).toBeDefined()
    expect(reverse?.label).toBe('modules.statusActions.reverseAudit')
  })

  it('采购订单: 终态「完成采购」记录不出现审核/反审核入口', () => {
    moduleKey = 'purchase-order'
    config = createConfig({ key: 'purchase-order', title: '采购订单' })
    selectedRowKeys = ['1']
    selectedRecords = [{ id: '1', status: '完成采购' }]
    renderOnce()

    const keys = latest.visibleToolbarActions.map((action) => action.key)
    expect(keys).not.toContain('bulk_audit')
    expect(keys).not.toContain('bulk_reverse_audit')
  })

  it('采购入库: 勾选一条完成入库记录出现「反审核」, 多选时置灰并给出原因', () => {
    moduleKey = 'purchase-inbound'
    config = createConfig({ key: 'purchase-inbound', title: '采购入库' })
    selectedRowKeys = ['1']
    selectedRecords = [{ id: '1', status: '完成入库' }]
    renderOnce()
    expect(
      latest.visibleToolbarActions.find(
        (action) => action.key === 'bulk_reverse_audit',
      )?.disabled,
    ).toBeFalsy()

    selectedRowKeys = ['1', '2']
    selectedRecords = [
      { id: '1', status: '完成入库' },
      { id: '2', status: '完成入库' },
    ]
    renderOnce()
    const reverse = latest.visibleToolbarActions.find(
      (action) => action.key === 'bulk_reverse_audit',
    )
    expect(reverse?.disabled).toBe(true)
    expect(reverse?.tooltip).toBe('hooks.toolbarActions.singleSelectionOnly')
  })

  it('shows the export-selected action only when rows are selected, with the count in the label', () => {
    expect(
      latest.visibleToolbarActions.some(
        (action) => action.key === 'export_selected',
      ),
    ).toBe(false)

    selectedRowKeys = ['1', '2']
    selectedRecords = [{ id: '1' }, { id: '2' }]
    renderOnce()

    const exportSelected = latest.visibleToolbarActions.find(
      (action) => action.key === 'export_selected',
    )
    expect(exportSelected).toBeDefined()
    expect(exportSelected?.label).toBe('hooks.toolbarActions.exportSelected')
  })

  it('routes the export-selected action only to the selected-records export handler', async () => {
    selectedRowKeys = ['1', '2']
    selectedRecords = [{ id: '1' }, { id: '2' }]
    handleExportSelectedRecordsMock.mockResolvedValue(true)
    renderOnce()

    await act(async () => {
      await latest.handleAction({
        key: 'export_selected',
        label: '导出选中 2 条',
        type: 'default',
      })
    })

    expect(handleExportSelectedRecordsMock).toHaveBeenCalledTimes(1)
    // 勾选导出不得回退到模块级「导出全部」
    expect(handleExportMock).not.toHaveBeenCalled()
  })

  it('routes list export toolbar actions through the shared export handler', async () => {
    await act(async () => {
      await latest.handleAction({
        key: 'export',
        label: '导出',
        type: 'default',
      })
    })
    expect(handleExportMock).toHaveBeenCalledTimes(1)
  })

  it('dispatches bulk delete through the batch handler', async () => {
    selectedRowKeys = ['1']
    selectedRecords = [{ id: '1' }]
    renderOnce()

    await act(async () => {
      await latest.handleAction({
        key: 'bulk_delete',
        label: '删除',
        type: 'default',
        danger: true,
      })
    })
    expect(handleSelectedDeleteRecordsMock).toHaveBeenCalledTimes(1)
  })

  it('routes sales-order delivery confirmation through modal confirm', async () => {
    moduleKey = 'sales-order'
    config = createConfig({ key: 'sales-order', title: '销售订单' })
    const record = { id: '9', status: '交付核定' } as ModuleRecord
    selectedRowKeys = ['9']
    selectedRecords = [record]
    renderOnce()

    const confirmAction = latest
      .buildActions(record)
      .find((action) => action.key === 'confirm-delivery-verification')
    expect(confirmAction).toBeDefined()

    let onOk: (() => Promise<void>) | undefined
    modalConfirmMock.mockImplementation((options) => {
      onOk = options.onOk
    })

    act(() => {
      confirmAction?.onClick()
    })
    expect(modalConfirmMock).toHaveBeenCalledTimes(1)
    expect(completeSalesOrderMock).not.toHaveBeenCalled()

    await act(async () => {
      await onOk?.()
    })
    expect(completeSalesOrderMock).toHaveBeenCalledWith('9')
    expect(messageSuccessMock).toHaveBeenCalledWith('完成销售成功')
    expect(refreshModuleQueriesMock).toHaveBeenCalledTimes(1)
  })
})
