import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { canMock } = vi.hoisted(() => ({
  canMock: vi.fn(),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: vi.fn((selector: (state: any) => any) => selector({
    can: canMock,
  })),
}))

import { useModulePermissions } from './useModulePermissions'

describe('useModulePermissions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    canMock.mockReturnValue(false)
  })

  it('returns permission flags', () => {
    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.canViewRecords).toBeDefined()
    expect(result.current.canCreateRecord).toBeDefined()
    expect(result.current.canUpdateRecord).toBeDefined()
    expect(result.current.canDeleteRecord).toBeDefined()
    expect(result.current.canExportData).toBeDefined()
    expect(result.current.canAuditRecord).toBeDefined()
    expect(result.current.canPrintRecord).toBeDefined()
  })

  it('uses moduleKey as resource when resourceKey is not provided', () => {
    renderHook(() => useModulePermissions({ moduleKey: 'sales-order' }))

    expect(canMock).toHaveBeenCalledWith('sales-order', 'read')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'create')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'update')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'delete')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'export')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'audit')
    expect(canMock).toHaveBeenCalledWith('sales-order', 'print')
  })

  it('uses resourceKey when provided', () => {
    renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order', resourceKey: 'order' })
    )

    expect(canMock).toHaveBeenCalledWith('order', 'read')
    expect(canMock).toHaveBeenCalledWith('order', 'create')
  })

  it('returns true for permissions user has', () => {
    canMock.mockImplementation((resource: string, action: string) => {
      return action === 'read' || action === 'create'
    })

    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.canViewRecords).toBe(true)
    expect(result.current.canCreateRecord).toBe(true)
    expect(result.current.canUpdateRecord).toBe(false)
    expect(result.current.canDeleteRecord).toBe(false)
  })

  it('returns false for all permissions when user has none', () => {
    canMock.mockReturnValue(false)

    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.canViewRecords).toBe(false)
    expect(result.current.canCreateRecord).toBe(false)
    expect(result.current.canUpdateRecord).toBe(false)
    expect(result.current.canDeleteRecord).toBe(false)
    expect(result.current.canExportData).toBe(false)
    expect(result.current.canAuditRecord).toBe(false)
    expect(result.current.canPrintRecord).toBe(false)
  })

  it('returns true for all permissions when user has all', () => {
    canMock.mockReturnValue(true)

    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.canViewRecords).toBe(true)
    expect(result.current.canCreateRecord).toBe(true)
    expect(result.current.canUpdateRecord).toBe(true)
    expect(result.current.canDeleteRecord).toBe(true)
    expect(result.current.canExportData).toBe(true)
    expect(result.current.canAuditRecord).toBe(true)
    expect(result.current.canPrintRecord).toBe(true)
  })

  it('exposes can function', () => {
    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.can).toBe(canMock)
  })

  it('exposes resolvedResource', () => {
    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order', resourceKey: 'order' })
    )

    expect(result.current.resolvedResource).toBe('order')
  })

  it('uses moduleKey as resolvedResource when resourceKey is not provided', () => {
    const { result } = renderHook(() =>
      useModulePermissions({ moduleKey: 'sales-order' })
    )

    expect(result.current.resolvedResource).toBe('sales-order')
  })
})
