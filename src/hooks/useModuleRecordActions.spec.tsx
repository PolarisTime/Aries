import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  errorMock,
  successMock,
  updateBusinessModuleStatusMock,
} = vi.hoisted(() => ({
  errorMock: vi.fn(),
  successMock: vi.fn(),
  updateBusinessModuleStatusMock: vi.fn(),
}))

vi.mock('@/api/business', () => ({
  updateBusinessModuleStatus: updateBusinessModuleStatusMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    error: errorMock,
    success: successMock,
  },
}))

import { usePermissionStore } from '@/stores/permissionStore'
import { useModuleRecordActions } from './useModuleRecordActions'

describe('useModuleRecordActions', () => {
  beforeEach(() => {
    errorMock.mockReset()
    successMock.mockReset()
    updateBusinessModuleStatusMock.mockReset()
    usePermissionStore.getState().setPermissions([
      { resource: 'sales-order', actions: ['read', 'audit'] },
    ])
  })

  it('audits a draft row directly without opening the editor', async () => {
    const onEdit = vi.fn()
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        onEdit,
        onAttach: vi.fn(),
        onRefresh,
      }),
    )

    const action = result.current
      .buildActions({ id: '101', status: '草稿' })
      .find((item) => item.key === 'audit')

    expect(action?.label).toBe('hooks.recordActions.audit')

    await act(async () => {
      action?.onClick()
    })

    expect(onEdit).not.toHaveBeenCalled()
    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      'sales-order',
      '101',
      '已审核',
    )
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows and executes reverse audit for an audited row', async () => {
    const onEdit = vi.fn()
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    updateBusinessModuleStatusMock.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        onEdit,
        onAttach: vi.fn(),
        onRefresh,
      }),
    )

    const action = result.current
      .buildActions({ id: '202', status: '已审核' })
      .find((item) => item.key === 'reverseAudit')

    expect(action?.label).toBe('hooks.recordActions.reverseAudit')

    await act(async () => {
      action?.onClick()
    })

    expect(onEdit).not.toHaveBeenCalled()
    expect(updateBusinessModuleStatusMock).toHaveBeenCalledWith(
      'sales-order',
      '202',
      '草稿',
    )
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not show reverse audit for a sales-completed row', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        listAuditTarget: { key: 'status', value: '已审核' },
        listReverseAuditTarget: { key: 'status', value: '草稿' },
        onEdit: vi.fn(),
        onAttach: vi.fn(),
        onRefresh: vi.fn(),
      }),
    )

    const action = result.current
      .buildActions({ id: '303', status: '完成销售' })
      .find((item) => item.key === 'reverseAudit' || item.key === 'audit')

    expect(action).toBeUndefined()
  })
})
