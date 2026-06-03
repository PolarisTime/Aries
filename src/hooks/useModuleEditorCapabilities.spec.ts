import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { isModuleLineItemsLockedMock, canManageEditorLineItemsMock,
  getBehaviorValueMock, buildListAuditTargetsMock, buildEditorAuditTargetMock,
  resolveStatusOptionsMock } = vi.hoisted(() => ({
  isModuleLineItemsLockedMock: vi.fn().mockReturnValue(false),
  canManageEditorLineItemsMock: vi.fn().mockReturnValue(true),
  getBehaviorValueMock: vi.fn(),
  buildListAuditTargetsMock: vi.fn().mockReturnValue({
    auditTarget: 'confirmed',
    reverseAuditTarget: 'draft',
  }),
  buildEditorAuditTargetMock: vi.fn().mockReturnValue('confirmed'),
  resolveStatusOptionsMock: vi.fn().mockReturnValue(['draft', 'confirmed']),
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  isModuleLineItemsLocked: isModuleLineItemsLockedMock,
  canManageEditorLineItems: canManageEditorLineItemsMock,
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  getBehaviorValue: getBehaviorValueMock,
}))

vi.mock('@/module-system/module-adapter-actions', () => ({
  buildListAuditTargets: buildListAuditTargetsMock,
  buildEditorAuditTarget: buildEditorAuditTargetMock,
  resolveStatusOptions: resolveStatusOptionsMock,
}))

import { useModuleEditorCapabilities } from './useModuleEditorCapabilities'

describe('useModuleEditorCapabilities', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
    formFields: [
      { key: 'status', title: 'Status' },
      { key: 'name', title: 'Name' },
    ],
    lineItemLockRelatedRows: [],
    canEditLineItems: true,
    canSaveCurrentEditor: true,
    canAuditRecords: true,
    canPrintRecords: true,
    canDeleteRecords: true,
    isReadOnly: false,
    resolveModuleStatusOptions: vi.fn().mockReturnValue(['draft', 'confirmed']),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    isModuleLineItemsLockedMock.mockReturnValue(false)
    canManageEditorLineItemsMock.mockReturnValue(true)
    getBehaviorValueMock.mockReturnValue(undefined)
    buildListAuditTargetsMock.mockReturnValue({
      auditTarget: 'confirmed',
      reverseAuditTarget: 'draft',
    })
    buildEditorAuditTargetMock.mockReturnValue('confirmed')
    resolveStatusOptionsMock.mockReturnValue(['draft', 'confirmed'])
  })

  it('returns all capability flags', () => {
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canAddManualEditorItems).toBeDefined()
    expect(result.current.canAuditEditor).toBeDefined()
    expect(result.current.canManageEditorItems).toBeDefined()
    expect(result.current.canSaveAndAuditCurrentEditor).toBeDefined()
    expect(result.current.canUseBulkAuditActions).toBeDefined()
    expect(result.current.canUseBulkDeleteActions).toBeDefined()
    expect(result.current.canUseBulkPrintActions).toBeDefined()
    expect(result.current.editorAuditTarget).toBeDefined()
    expect(result.current.lineItemsLocked).toBeDefined()
    expect(result.current.listAuditTarget).toBeDefined()
    expect(result.current.listReverseAuditTarget).toBeDefined()
    expect(result.current.listStatusOptions).toBeDefined()
    expect(result.current.lockedLineItemsNotice).toBeDefined()
  })

  it('detects line items locked state', () => {
    isModuleLineItemsLockedMock.mockReturnValue(true)
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.lineItemsLocked).toBe(true)
  })

  it('uses lineItemsLockedOverride when provided', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, lineItemsLockedOverride: true })
    )
    expect(result.current.lineItemsLocked).toBe(true)
    expect(isModuleLineItemsLockedMock).not.toHaveBeenCalled()
  })

  it('disables bulk audit when isReadOnly is true', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, isReadOnly: true })
    )
    expect(result.current.canUseBulkAuditActions).toBe(false)
  })

  it('disables bulk audit when canAuditRecords is false', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, canAuditRecords: false })
    )
    expect(result.current.canUseBulkAuditActions).toBe(false)
  })

  it('disables bulk delete when isReadOnly is true', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, isReadOnly: true })
    )
    expect(result.current.canUseBulkDeleteActions).toBe(false)
  })

  it('disables bulk delete when canDeleteRecords is false', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, canDeleteRecords: false })
    )
    expect(result.current.canUseBulkDeleteActions).toBe(false)
  })

  it('enables bulk print when canPrintRecords is true', () => {
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canUseBulkPrintActions).toBe(true)
  })

  it('disables bulk print when canPrintRecords is false', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, canPrintRecords: false })
    )
    expect(result.current.canUseBulkPrintActions).toBe(false)
  })

  it('enables save and audit when all conditions met', () => {
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canSaveAndAuditCurrentEditor).toBe(true)
  })

  it('disables save and audit when cannot save', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, canSaveCurrentEditor: false })
    )
    expect(result.current.canSaveAndAuditCurrentEditor).toBe(false)
  })

  it('disables add manual items when behavior disallows', () => {
    getBehaviorValueMock.mockReturnValue(false)
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canAddManualEditorItems).toBe(false)
  })

  it('shows locked notice when line items are locked', () => {
    isModuleLineItemsLockedMock.mockReturnValue(true)
    getBehaviorValueMock.mockReturnValue('Items are locked')
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.lockedLineItemsNotice).toBe('Items are locked')
  })

  it('disables canAuditEditor when no editorAuditTarget', () => {
    buildEditorAuditTargetMock.mockReturnValue(null)
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canAuditEditor).toBe(false)
    expect(result.current.canSaveAndAuditCurrentEditor).toBe(false)
  })

  it('disables canManageEditorItems when canManageEditorLineItems returns false', () => {
    canManageEditorLineItemsMock.mockReturnValue(false)
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canManageEditorItems).toBe(false)
    expect(result.current.canAddManualEditorItems).toBe(false)
  })

  it('uses listStatusFields when provided', () => {
    const listStatusFields = [
      { key: 'status', title: 'Status', defaultValue: 'confirmed' },
    ]
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, listStatusFields }),
    )
    expect(result.current.listStatusOptions).toBeDefined()
  })

  it('returns empty locked notice when line items not locked', () => {
    isModuleLineItemsLockedMock.mockReturnValue(false)
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.lockedLineItemsNotice).toBe('')
  })

  it('returns empty locked notice when behavior value is empty string', () => {
    isModuleLineItemsLockedMock.mockReturnValue(true)
    getBehaviorValueMock.mockReturnValue('')
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.lockedLineItemsNotice).toBe('')
  })

  it('disables bulk audit when listAuditTarget is null', () => {
    buildListAuditTargetsMock.mockReturnValue({
      auditTarget: null,
      reverseAuditTarget: null,
    })
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canUseBulkAuditActions).toBe(false)
  })

  it('disables bulk audit when listReverseAuditTarget is null', () => {
    buildListAuditTargetsMock.mockReturnValue({
      auditTarget: 'confirmed',
      reverseAuditTarget: null,
    })
    const { result } = renderHook(() => useModuleEditorCapabilities(defaultProps))
    expect(result.current.canUseBulkAuditActions).toBe(false)
  })

  it('disables canSaveAndAuditCurrentEditor when canAuditRecords is false', () => {
    const { result } = renderHook(() =>
      useModuleEditorCapabilities({ ...defaultProps, canAuditRecords: false }),
    )
    expect(result.current.canSaveAndAuditCurrentEditor).toBe(false)
  })
})
