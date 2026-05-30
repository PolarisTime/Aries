import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePermissionStore } from '@/stores/permissionStore'
import { useModuleRecordActions } from './useModuleRecordActions'

describe('useModuleRecordActions', () => {
  beforeEach(() => {
    usePermissionStore.getState().setPermissions([
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
})
