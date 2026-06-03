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
        onEdit: vi.fn(),
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

    expect(draftActions.map((item) => item.key)).toEqual(['edit', 'attach'])
    expect(auditedActions.map((item) => item.key)).toEqual(['edit', 'attach'])
    expect(
      [...draftActions, ...auditedActions].some(
        (item) => item.key === 'audit' || item.key === 'reverseAudit',
      ),
    ).toBe(false)
  })

  it('can still show view, edit and attachment actions by permission', () => {
    const onDetail = vi.fn()
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onEdit: vi.fn(),
        onAttach: vi.fn(),
        onDetail,
      }),
    )

    expect(
      result.current
        .buildActions({ id: '303', status: '草稿' })
        .map((item) => item.key),
    ).toEqual(['detail', 'edit', 'attach'])
  })

  it('returns empty actions when isReadOnly is true', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        isReadOnly: true,
        onEdit: vi.fn(),
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
        onEdit: vi.fn(),
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
        onEdit: vi.fn(),
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

  it('disables edit button when edit is blocked by status', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onEdit: vi.fn(),
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '已审核',
    })
    const editAction = actions.find((a) => a.key === 'edit')
    expect(editAction?.disabled).toBeDefined()
  })

  it('does not return detail action when onDetail is not provided', () => {
    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onEdit: vi.fn(),
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
        onEdit: vi.fn(),
        onAttach: vi.fn(),
      }),
    )

    const actions = result.current.buildActions({
      id: '101',
      status: '草稿',
    })
    expect(actions.find((a) => a.key === 'edit')).toBeDefined()
  })

  it('returns only attach action when user has read but not update', () => {
    usePermissionStore
      .getState()
      .setPermissions([{ resource: 'sales-order', actions: ['read'] }])

    const { result } = renderHook(() =>
      useModuleRecordActions({
        moduleKey: 'sales-order',
        onEdit: vi.fn(),
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
        onEdit: vi.fn(),
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
        onEdit: vi.fn(),
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
