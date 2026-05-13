import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  confirmMock,
  warningMock,
  successMock,
  getBusinessModuleDetailMock,
  saveBusinessModuleMock,
  deleteBusinessModuleMock,
} = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  warningMock: vi.fn(),
  successMock: vi.fn(),
  getBusinessModuleDetailMock: vi.fn(),
  saveBusinessModuleMock: vi.fn(),
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
  getBusinessModuleDetail: getBusinessModuleDetailMock,
  saveBusinessModule: saveBusinessModuleMock,
}))

vi.mock('@/views/modules/module-behavior-registry', () => ({
  isDeleteBlockedByStatus: (status: unknown) => status === '已审核',
  isEditBlockedByStatus: (status: unknown) => status === '已完成',
}))

import { useBusinessGridBatchActions } from './useBusinessGridBatchActions'

describe('useBusinessGridBatchActions', () => {
  beforeEach(() => {
    confirmMock.mockReset()
    warningMock.mockReset()
    successMock.mockReset()
    getBusinessModuleDetailMock.mockReset()
    saveBusinessModuleMock.mockReset()
    deleteBusinessModuleMock.mockReset()
  })

  it('uses selected rows from preserved cross-page selection for audit', async () => {
    getBusinessModuleDetailMock.mockImplementation((_moduleKey, id) => ({
      data: { id, status: '待审核' },
    }))
    saveBusinessModuleMock.mockResolvedValue(undefined)

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
      result.current.handleSelectedAuditRecords()
    })

    expect(confirmMock).toHaveBeenCalledTimes(1)
    const confirmArg = confirmMock.mock.calls[0]?.[0]
    expect(confirmArg.content).toContain('2 条记录')

    await act(async () => {
      await confirmArg.onOk()
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(2)
    expect(getBusinessModuleDetailMock).toHaveBeenNthCalledWith(
      1,
      'purchase-order',
      '101',
    )
    expect(getBusinessModuleDetailMock).toHaveBeenNthCalledWith(
      2,
      'purchase-order',
      '202',
    )
    expect(saveBusinessModuleMock).toHaveBeenCalledTimes(2)
    expect(refreshAndClearSelection).toHaveBeenCalledTimes(1)
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
    expect(confirmArg.content).toContain('删除选中的 1 条记录')
    expect(confirmArg.content).toContain('跳过')

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
