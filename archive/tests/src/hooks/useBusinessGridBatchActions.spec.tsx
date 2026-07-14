import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  confirmMock,
  warningMock,
  successMock,
  updateBusinessModuleStatusMock,
  deleteBusinessModuleMock,
} = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  warningMock: vi.fn(),
  successMock: vi.fn(),
  updateBusinessModuleStatusMock: vi.fn(),
  deleteBusinessModuleMock: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: warningMock,
    success: successMock,
  },
  modal: {
    confirm: confirmMock,
  },
}))

vi.mock('@/api/business', () => ({
  deleteBusinessModule: deleteBusinessModuleMock,
  updateBusinessModuleStatus: updateBusinessModuleStatusMock,
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  isDeleteBlockedByStatus: (status: unknown, moduleKey?: string) =>
    status === '已审核' ||
    (moduleKey === 'purchase-refund' && status === '草稿'),
  getBehaviorValue: (moduleKey: string, key: string) => {
    if (key !== 'reverseAuditTargetsByStatus') return undefined
    if (moduleKey === 'purchase-order') return { 完成采购: '已审核' }
    if (moduleKey === 'purchase-inbound') return { 完成入库: '草稿' }
    return undefined
  },
}))

import { useBusinessGridBatchActions } from './useBusinessGridBatchActions'

describe('useBusinessGridBatchActions', () => {
  beforeEach(() => {
    confirmMock.mockReset()
    warningMock.mockReset()
    successMock.mockReset()
    updateBusinessModuleStatusMock.mockReset()
    deleteBusinessModuleMock.mockReset()
  })

  it('uses selected rows from preserved cross-page selection for audit', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '草稿' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    expect(confirmMock).toHaveBeenCalledTimes(1)
    const confirmArg = confirmMock.mock.calls[0]?.[0]
    expect(confirmArg.title).toBe('hooks.batchActions.batchAudit')

    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(2)
    expect(updateBusinessModuleStatusMock).toHaveBeenNthCalledWith(
      1,
      'purchase-order',
      '101',
      '已审核',
    )
    expect(updateBusinessModuleStatusMock).toHaveBeenNthCalledWith(
      2,
      'purchase-order',
      '202',
      '已审核',
    )
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('uses configured audit source statuses when filtering audit rows', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'sales-outbound',
        selectedRowKeys: ['101', '202', '303'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '预出库' },
          { id: '303', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        listAuditSourceStatuses: ['草稿', '预出库'],
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    expect(confirmMock).toHaveBeenCalledTimes(1)
    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(2)
    expect(updateBusinessModuleStatusMock).toHaveBeenNthCalledWith(
      1,
      'sales-outbound',
      '101',
      '已审核',
    )
    expect(updateBusinessModuleStatusMock).toHaveBeenNthCalledWith(
      2,
      'sales-outbound',
      '202',
      '已审核',
    )
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('skips completed rows for reverse audit', () => {
    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '完成销售' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.reverseAuditNotSupported',
    )
  })

  it('skips blocked rows when deleting preserved selected rows', async () => {
    deleteBusinessModuleMock.mockResolvedValue(undefined)
    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '待审核' },
          { id: '202', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    expect(confirmMock).toHaveBeenCalledTimes(1)
    const confirmArg = confirmMock.mock.calls[0]?.[0]
    expect(confirmArg.title).toBe('hooks.batchActions.batchDelete')

    await act(async () => {
      await confirmArg.onOk()
    })

    expect(deleteBusinessModuleMock).toHaveBeenCalledTimes(1)
    expect(deleteBusinessModuleMock).toHaveBeenCalledWith(
      'purchase-order',
      '101',
    )
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('shows warning when no rows selected for audit', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: [],
        selectedRows: [],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.pleaseSelectRecords',
    )
  })

  it('shows warning when no batch audit target', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '草稿' }],
        listAuditTarget: null,
        listReverseAuditTarget: null,
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.noBatchAuditStatus',
    )
  })

  it('shows warning when no eligible rows for audit', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '已审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.auditNotSupported',
    )
  })

  it('shows warning when no rows selected for delete', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: [],
        selectedRows: [],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.pleaseSelectRecords',
    )
  })

  it('shows warning when no eligible rows for delete', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '已审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.deleteNotSupported',
    )
  })

  it('applies module-specific delete protection to generated refunds', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-refund',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '草稿' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.deleteNotSupported',
    )
  })

  it('shows warning when no rows selected for reverse audit', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: [],
        selectedRows: [],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.pleaseSelectRecords',
    )
  })

  it('shows warning when no reverse audit target', () => {
    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'test',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '草稿' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: null,
        refreshAndClearSelection: vi.fn(),
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    expect(warningMock).toHaveBeenCalledWith(
      'hooks.batchActions.noBatchReverseAuditStatus',
    )
  })

  it('handles partially failed audit operations', async () => {
    updateBusinessModuleStatusMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('审核失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '草稿' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('handles partially failed delete operations', async () => {
    deleteBusinessModuleMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('删除失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '待审核' },
          { id: '202', status: '待审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('handles eligible reverse audit operation', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '已审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    expect(confirmArg.title).toBe('hooks.batchActions.batchReverseAudit')

    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      'purchase-order',
      '101',
      '草稿',
    )
    expect(successMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['purchase-order', '完成采购', '已审核'],
    ['purchase-inbound', '完成入库', '草稿'],
  ])('uses the configured reverse target for completed %s records', async (moduleKey, status, targetStatus) => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)
    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey,
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })
    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      moduleKey,
      '101',
      targetStatus,
    )
  })

  it('handles partially failed reverse audit', async () => {
    updateBusinessModuleStatusMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('撤销失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '已审核' },
          { id: '202', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('handles non-Error rejection in audit', async () => {
    updateBusinessModuleStatusMock.mockRejectedValue('string error')

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '草稿' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalled()
  })

  it('handles non-Error rejection in delete', async () => {
    deleteBusinessModuleMock.mockRejectedValue('string error')

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '待审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalled()
  })

  it('handles non-Error rejection in reverse audit', async () => {
    updateBusinessModuleStatusMock.mockRejectedValue('string error')

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '已审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalled()
  })

  it('handles successful audit with all rows', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '草稿' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(successMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalled()
  })

  it('handles successful delete with all rows', async () => {
    deleteBusinessModuleMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '待审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(successMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalled()
  })

  it('includes skipped rows in successful audit feedback', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(1)
    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      'purchase-order',
      '101',
      '已审核',
    )
    expect(successMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('keeps the first audit error when later audit rows also fail', async () => {
    updateBusinessModuleStatusMock
      .mockRejectedValueOnce(new Error('首次审核失败'))
      .mockRejectedValueOnce(new Error('再次审核失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202', '303'],
        selectedRows: [
          { id: '101', status: '草稿' },
          { id: '202', status: '草稿' },
          { id: '303', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(2)
    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('omits audit error details when the failure has an empty message', async () => {
    updateBusinessModuleStatusMock.mockRejectedValue(new Error(''))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '草稿' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('keeps the first delete error when later delete rows also fail', async () => {
    deleteBusinessModuleMock
      .mockRejectedValueOnce(new Error('首次删除失败'))
      .mockRejectedValueOnce(new Error('再次删除失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202', '303'],
        selectedRows: [
          { id: '101', status: '待审核' },
          { id: '202', status: '待审核' },
          { id: '303', status: '已审核' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(deleteBusinessModuleMock).toHaveBeenCalledTimes(2)
    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('omits delete error details when the failure has an empty message', async () => {
    deleteBusinessModuleMock.mockRejectedValue(new Error(''))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '待审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '待审核' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedDeleteRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('includes skipped rows in successful reverse audit feedback', async () => {
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202'],
        selectedRows: [
          { id: '101', status: '已审核' },
          { id: '202', status: '草稿' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(1)
    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      'purchase-order',
      '101',
      '草稿',
    )
    expect(successMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('keeps the first reverse audit error when later rows also fail', async () => {
    updateBusinessModuleStatusMock
      .mockRejectedValueOnce(new Error('首次反审核失败'))
      .mockRejectedValueOnce(new Error('再次反审核失败'))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101', '202', '303'],
        selectedRows: [
          { id: '101', status: '已审核' },
          { id: '202', status: '已审核' },
          { id: '303', status: '草稿' },
        ],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(updateBusinessModuleStatusMock).toHaveBeenCalledTimes(2)
    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })

  it('omits reverse audit error details when the failure has an empty message', async () => {
    updateBusinessModuleStatusMock.mockRejectedValue(new Error(''))

    const refreshAndClearSelection = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useBusinessGridBatchActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['101'],
        selectedRows: [{ id: '101', status: '已审核' }],
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        refreshAndClearSelection,
      }),
    )

    act(() => {
      result.current.handleSelectedReverseAuditRecords()
    })

    const confirmArg = confirmMock.mock.calls[0]?.[0]
    await act(async () => {
      await confirmArg.onOk()
    })

    expect(warningMock).toHaveBeenCalled()
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
  })
})
