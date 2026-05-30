import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { useModuleToolbarActions } from './useModuleToolbarActions'

const baseConfig: ModulePageConfig = {
  key: 'sales-order',
  title: '',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
}

function createHandlers() {
  return {
    exportMaterialRows: vi.fn().mockResolvedValue(undefined),
    exportRows: vi.fn().mockResolvedValue(undefined),
    handleSelectedAuditRecords: vi.fn(),
    handleSelectedDeleteRecords: vi.fn(),
    handleSelectedReverseAuditRecords: vi.fn(),
    markSelectedFreightDelivered: vi.fn(),
    navigateToRoleActionEditor: vi.fn(),
    openCreateEditor: vi.fn().mockResolvedValue(undefined),
    openCustomerStatementGenerator: vi.fn(),
    openFreightPickupList: vi.fn(),
    openFreightStatementGenerator: vi.fn(),
    openFreightSummary: vi.fn().mockResolvedValue(undefined),
    openSupplierStatementGenerator: vi.fn(),
  }
}

describe('useModuleToolbarActions', () => {
  it('keeps batch audit actions in the list toolbar', () => {
    const handlers = createHandlers()

    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: true,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers,
      }),
    )

    expect(result.current.visibleToolbarActions.map((item) => item.label)).toEqual(
      ['hooks.toolbarActions.audit', 'hooks.toolbarActions.reverseAudit'],
    )

    act(() => {
      void result.current.handleAction(
        result.current.visibleToolbarActions[0],
      )
      void result.current.handleAction(
        result.current.visibleToolbarActions[1],
      )
    })

    expect(handlers.handleSelectedAuditRecords).toHaveBeenCalledTimes(1)
    expect(handlers.handleSelectedReverseAuditRecords).toHaveBeenCalledTimes(1)
  })

  it('does not add duplicate print preview or direct print toolbar buttons', () => {
    const { result } = renderHook(() =>
      useModuleToolbarActions({
        moduleKey: 'sales-order',
        config: baseConfig,
        formFields: [],
        isMaterialModule: false,
        selectedRowCount: 1,
        canUseBulkAuditActions: false,
        canUseBulkDeleteActions: false,
        hasAnyModuleAction: () => true,
        handlers: createHandlers(),
      }),
    )

    expect(result.current.visibleToolbarActions.map((item) => item.label)).toEqual(
      [],
    )
  })
})
