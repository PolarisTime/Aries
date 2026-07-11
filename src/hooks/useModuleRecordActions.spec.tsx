import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePermissionStore } from '@/stores/permissionStore'
import { useModuleRecordActions } from './useModuleRecordActions'

describe('useModuleRecordActions', () => {
  beforeEach(() => {
    usePermissionStore
      .getState()
      .setPermissions([
        { resource: 'sales-order', actions: ['read', 'update', 'audit'] },
      ])
  })

  it('keeps audit and reverse audit out of row actions', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const draftActions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    const auditedActions = result.current.buildActions({
      id: '202',
      status: '已审核',
    })

    expect(draftActions.map((item) => item.key)).toEqual(['attach'])
    expect(auditedActions.map((item) => item.key)).toEqual(['attach'])
    expect(
      [...draftActions, ...auditedActions].some(
        (item) =>
          item.key === 'edit' ||
          item.key === 'audit' ||
          item.key === 'reverseAudit',
      ),
    ).toBe(false)
  })

  it('can still show view and attachment actions by permission', () => {
    const onDetail = vi.fn()
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onDetail,
      }),
    )

    expect(
      result.current
        .buildActions({ id: '303', status: '草稿' })
        .map((item) => item.key),
    ).toEqual(['detail', 'attach'])
  })

  it('uses custom detail action label when provided', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onDetail: vi.fn(),
        detailActionLabel: '流水',
      }),
    )

    const detailAction = result.current
      .buildActions({ id: '303', status: '草稿' })
      .find((item) => item.key === 'detail')

    expect(detailAction?.label).toBe('流水')
  })

  it('shows attachment count next to attachment action label', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        attachmentCounts: { '101': 2 },
        onAttach: vi.fn(),
      }),
    )

    const attachAction = result.current
      .buildActions({
        id: '101',
        status: '草稿',
      })
      .find((item) => item.key === 'attach')

    expect(attachAction?.label).toBe('hooks.recordActions.attachment(2)')
  })

  it('falls back to attachmentIds array length when no count or attachment list exists', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const attachAction = result.current
      .buildActions({
        id: '101',
        status: '草稿',
        attachmentIds: ['a-1', 'a-2', 'a-3'],
      })
      .find((item) => item.key === 'attach')

    expect(attachAction?.label).toBe('hooks.recordActions.attachment(3)')
  })

  it('falls back to attachments array length when count map has no entry', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const attachAction = result.current
      .buildActions({
        id: '101',
        status: '草稿',
        attachments: [{ id: 'a-1' }, { id: 'a-2' }],
      })
      .find((item) => item.key === 'attach')

    expect(attachAction?.label).toBe('hooks.recordActions.attachment(2)')
  })

  it('returns empty actions when isReadOnly is true', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        isReadOnly: true,
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions).toHaveLength(0)
  })

  it('returns only view action when user lacks update permission', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.map((item) => item.key)).toEqual(['attach'])
  })

  it('returns only detail when user has read-only and onDetail provided', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onDetail: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.map((item) => item.key)).toEqual(['detail', 'attach'])
  })

  it('does not return detail action when onDetail is not provided', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.find((a) => a.key === 'detail')).toBeUndefined()
  })

  it('uses resourceKey when provided', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'order', actions: ['read', 'update'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        resourceKey: 'order',
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.map((a) => a.key)).toEqual(['attach'])
  })

  it('returns only attach action when user has read but not update', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.map((a) => a.key)).toEqual(['attach'])
  })

  it('returns empty actions when user has no read or update permission', () => {
    usePermissionStore.getState().setPermissions([])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions).toHaveLength(0)
  })

  it('isReadOnly returns only detail when onDetail is provided', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        isReadOnly: true,
        onAttach: vi.fn(),
        onDetail: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    // isReadOnly returns early, but detail is added before the isReadOnly check
    expect(actions.map((a) => a.key)).toEqual(['detail'])
  })

  it('invokes detail and attachment callbacks with the selected record', () => {
    const onAttach = vi.fn()
    const onDetail = vi.fn()
    const record = { id: '101', status: '草稿' }
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach,
        onDetail,
      }),
    )

    const actions = result.current.buildActions(record)
    actions.find((item) => item.key === 'detail')?.onClick?.()
    actions.find((item) => item.key === 'attach')?.onClick?.()

    expect(onDetail).toHaveBeenCalledWith(record)
    expect(onAttach).toHaveBeenCalledWith(record)
  })

  it('does not put reopen verification in sales order row actions', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read', 'audit'] }])
    const record = { id: '101', status: '完成销售' }

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onStatusChange: vi.fn(),
      }),
    )

    expect(
      result.current.buildActions(record).map((item) => item.key),
    ).not.toContain('reopen-delivery-verification')
  })

  it('returns confirm action for sales orders under delivery verification', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read', 'audit'] }])
    const onStatusChange = vi.fn()
    const record = { id: '101', status: '交付核定' }

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onStatusChange,
      }),
    )

    const action = result.current
      .buildActions(record)
      .find((item) => item.key === 'confirm-delivery-verification')
    action?.onClick?.()

    expect(action?.label).toBe(
      'hooks.recordActions.confirmDeliveryVerification',
    )
    expect(onStatusChange).toHaveBeenCalledWith(record, '完成销售')
  })

  it('does not return delivery verification actions without audit permission', () => {
    usePermissionStore
      .getState()
      .setPermissions([
        { resource: 'sales-order', actions: ['read', 'update'] },
      ])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
        onStatusChange: vi.fn(),
      }),
    )

    expect(
      result.current
        .buildActions({ id: '101', status: '完成销售' })
        .map((item) => item.key),
    ).not.toContain('reopen-delivery-verification')
  })
})
