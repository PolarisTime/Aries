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
})
