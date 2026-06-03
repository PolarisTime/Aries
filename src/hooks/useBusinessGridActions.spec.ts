import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useBusinessGridBatchActionsMock,
  useBusinessGridFreightActionsMock,
  useBusinessGridPrintActionsMock,
  useBusinessGridStatementActionsMock,
} = vi.hoisted(() => ({
  useBusinessGridBatchActionsMock: vi.fn().mockReturnValue({
    handleSelectedAuditRecords: vi.fn(),
    handleSelectedDeleteRecords: vi.fn(),
    handleSelectedReverseAuditRecords: vi.fn(),
    markSelectedFreightDelivered: vi.fn(),
  }),
  useBusinessGridFreightActionsMock: vi.fn().mockReturnValue({
    openFreightSummary: vi.fn(),
  }),
  useBusinessGridPrintActionsMock: vi.fn().mockReturnValue({
    handlePrintSelectedRecords: vi.fn(),
  }),
  useBusinessGridStatementActionsMock: vi.fn().mockReturnValue({
    handleStatementGenerate: vi.fn(),
  }),
}))

vi.mock('@/hooks/useBusinessGridBatchActions', () => ({
  useBusinessGridBatchActions: useBusinessGridBatchActionsMock,
}))

vi.mock('@/hooks/useBusinessGridFreightActions', () => ({
  useBusinessGridFreightActions: useBusinessGridFreightActionsMock,
}))

vi.mock('@/hooks/useBusinessGridPrintActions', () => ({
  useBusinessGridPrintActions: useBusinessGridPrintActionsMock,
}))

vi.mock('@/hooks/useBusinessGridStatementActions', () => ({
  useBusinessGridStatementActions: useBusinessGridStatementActionsMock,
}))

import { useBusinessGridActions } from './useBusinessGridActions'

describe('useBusinessGridActions', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
    selectedRowKeys: ['1', '2'],
    selectedRows: [{ id: '1' }, { id: '2' }],
    submittedFilters: { status: 'pending' },
    listAuditTarget: 'confirmed' as const,
    listReverseAuditTarget: 'draft' as const,
    refreshModuleQueries: vi.fn().mockResolvedValue(undefined),
    clearSelection: vi.fn(),
    formatCellValue: vi.fn((v: unknown) => String(v)),
  }

  beforeEach(() => {
    vi.resetAllMocks()

    useBusinessGridBatchActionsMock.mockReturnValue({
      handleSelectedAuditRecords: vi.fn(),
      handleSelectedDeleteRecords: vi.fn(),
      handleSelectedReverseAuditRecords: vi.fn(),
      markSelectedFreightDelivered: vi.fn(),
    })
    useBusinessGridFreightActionsMock.mockReturnValue({
      openFreightSummary: vi.fn(),
    })
    useBusinessGridPrintActionsMock.mockReturnValue({
      handlePrintSelectedRecords: vi.fn(),
    })
    useBusinessGridStatementActionsMock.mockReturnValue({
      handleStatementGenerate: vi.fn(),
    })
  })

  it('returns all action handlers', () => {
    const { result } = renderHook(() => useBusinessGridActions(defaultProps))

    expect(result.current.handlePrintSelectedRecords).toBeDefined()
    expect(result.current.handleSelectedAuditRecords).toBeDefined()
    expect(result.current.handleSelectedDeleteRecords).toBeDefined()
    expect(result.current.handleSelectedReverseAuditRecords).toBeDefined()
    expect(result.current.markSelectedFreightDelivered).toBeDefined()
    expect(result.current.openFreightSummary).toBeDefined()
    expect(result.current.handleStatementGenerate).toBeDefined()
  })

  it('passes correct props to useBusinessGridPrintActions', () => {
    renderHook(() => useBusinessGridActions(defaultProps))

    expect(useBusinessGridPrintActionsMock).toHaveBeenCalledWith({
      moduleKey: 'sales-order',
      selectedRowKeys: ['1', '2'],
    })
  })

  it('passes correct props to useBusinessGridBatchActions', () => {
    renderHook(() => useBusinessGridActions(defaultProps))

    expect(useBusinessGridBatchActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1', '2'],
        selectedRows: [{ id: '1' }, { id: '2' }],
        listAuditTarget: 'confirmed',
        listReverseAuditTarget: 'draft',
      }),
    )
  })

  it('passes correct props to useBusinessGridFreightActions', () => {
    renderHook(() => useBusinessGridActions(defaultProps))

    expect(useBusinessGridFreightActionsMock).toHaveBeenCalledWith({
      submittedFilters: { status: 'pending' },
      formatCellValue: defaultProps.formatCellValue,
    })
  })

  it('passes correct props to useBusinessGridStatementActions', () => {
    renderHook(() => useBusinessGridActions(defaultProps))

    expect(useBusinessGridStatementActionsMock).toHaveBeenCalledWith({
      refreshModuleQueries: defaultProps.refreshModuleQueries,
    })
  })

  it('creates refreshAndClearSelection function', async () => {
    const refreshModuleQueries = vi.fn().mockResolvedValue(undefined)
    const clearSelection = vi.fn()

    renderHook(() =>
      useBusinessGridActions({
        ...defaultProps,
        refreshModuleQueries,
        clearSelection,
      }),
    )

    const batchActionsCall = useBusinessGridBatchActionsMock.mock.calls[0][0]
    await batchActionsCall.refreshAndClearSelection()

    expect(clearSelection).toHaveBeenCalled()
    expect(refreshModuleQueries).toHaveBeenCalled()
  })
})
