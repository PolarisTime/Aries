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
  getBusinessModuleDetail: vi.fn(),
  saveBusinessModule: vi.fn(),
  updateBusinessModuleStatus: updateBusinessModuleStatusMock,
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  isDeleteBlockedByStatus: (status: unknown) => status === '已审核',
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
})
